# SPEC-R48-LIBR · 分类归档小图书难度加深改造（r48，2026-09-22）

依据：AUDIT-67 段序 38 🟡 判定「实测首关 75.2s——**ch1-2 两格=4 岁分类**；ch3-4 冲突卡
是真内容但仅 4 张」；建议三维度（ch1 起即四格/冲突卡升半数以上/加跨维归类二级题）。
校准：batch38 段标称 6-7 岁信息素养·语义主题分类归档，宁难勿易——r15-r47 同口径。
本文件为 libr 的 r48 难度谱定稿；与 game-*.js 旧注释/SPEC-BATCH38 §0.92/§2 的 v1
难度面冲突处以本文件为准（v1 记录留档不删，r33/r34/r44 同款声明）。
**SPEC-BATCH38 §0.92「dch≤2 取前 2 格，dch≥3 取前 4 格」由本文件显式废止（delta 明令
ch1 起即四格）；v1 DIM_HINTS/DIM_KEYS（lb_dim_* 泄漏句族）由本文件废止引用（退役归
主线段二）。**

## §R0 目标

保留玩法框架（书架归档+当前卡/挑书盘双形态、单 tap 单步判定、教学看→帮→独、
星级=retries 口径、救援双锚 14s/30s、错反馈两级+豁免窗 4170、存档 kidsgame_libr
v1.0、CH_LEN=5、静态 20 关、seed=mulberry32(flat*7919+837) 确定性通道全部不变），
消除「分类空心」（ch1-2 十关两格二选一=4 岁级；真内容冲突卡仅 4 张占 20%）——改造后
ch1 起恒四格四主题，ch2 维度句入题（去泄漏），ch3 冲突卡升 11/20>半，ch4 跨维二级题
pick（反向挑书，Bloom 反向+跨维辨别）。
验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R7 键表+主线段二注册 TODO）；
计数断言改动前已核当前在册数=12（lb_ 9+core_ 3，manifest 实查 2026-09-22；其中
lb_dim_* 4 条为 T46 注册仍在册——代码已不引用），build.py clips 断言按 12 保持，
注册后 20 由主线改（TODO 注明）——**段二终态（2026-09-22）：预估 20 未含 lb_dim
退役，实收 12-4+8=16（§R7b 销账）**；测试静音双保险（每页面 goto 前挂静音 init_script
r28 定稿 function 版+种档 settings{sound:false,tts:false,vol:0}）。

## §R1 设计总纲（审计三建议承接方式+锚面消歧）

**维度一·ch1 起恒四格（域 2→4 全档）**：
- `shuffled(THEMES.slice(0, 4))` 恒四主题（animal/food/clothes/vehicle）；静态与
  生成关同律。格序每关 seeded 打乱（禁位置学习——孩子须读标签牌，信息素养核心锚）。
- **锚面消歧（flat0 q0 教学锚）**：题面/推导链逐字节保留——card=cat、hint=none、
  say=「它住哪一格呢」（lb_hint）、label=小猫、theme=animal；shelf 2→4 为 delta
  明令的域扩展必然面（r44「语义/教学面保留+域扩展必然面」同款先例）。教学迷你关
  （watch/turn，flat=-1）恒两格**字节级保留**（降坡锚：教学两格→正式四格的坡度
  缓冲；tutWatchLevel rows [0,3]→[0,1]——row3 car 主题 vehicle 不在两格迷你书架，
  row1 apple→food 合法；第二题构造占位永不游玩。**r48-fix m6 勘正：保留面=玩法/
  题面/两格形态，非全字段字节级——row3→row1 为显式修正（原 row3 构造 answer=-1
  非法）；v1 原状 rows=[0,3] 系 SPEC 单方声明（baseline 谱不含 flat=-1），可由 git
  史补证**）。
- verify ⑫ realPath 断言 shelf.length===4；谱投影 shelf 尺寸全集={4}。

**维度二·冲突卡升半数以上（hint 行 4→11/20=55%）**：
- 章谱重排：ch1（rows 0-4）四主题普通归档×4+章末首条维度句（chick/farm，**r48-fix m2
  勘正：关内降坡仅 flat0 关内题序成立（前 4 题纯普通再上维度）；章池 rotate（rows=
  base+(lv+k)%5）使 flat1-4 维度句位置前移，flat4（rows=[4,0,1,2,3]）维度句居首题——
  ch1 五关每关恰含 row4 一次（章池封闭必然），实际起步谱=每关 1 条维度句 5/25=20%，
  无「零冲突关」，难度仍平缓但非「前四关零冲突」**）；ch2（5-9）维度句入题 5 条；ch3（10-14）冲突卡深化 5 条
  （egg 食物/动物产物、dog·rabbit 动物/宠物、scarf 衣物/礼物、milk 食物/来自奶牛）
  ——hint 行合计 11/20>半（build.py 静态断言 len==11+verify ⑥ conflictN===11）。
- **维度句去泄漏（v1 泄漏根除）**：v1 句「它住在农场，是动物」直接念主题名=零推理
  泄漏；r48 句只陈述分类**标准**（farm→「它住在农场里」/eat→「我们能吃它」/
  pet→「它是我们的好朋友」/wear→「天冷了要穿上它」），孩子须自行完成标准→主题格
  映射（信息素养核心=分类标准决定归类）。新键 lb_d2_*（§R7）。
- **两义性收口（DIM2_TARGET 定约）**：`{farm:animal, eat:food, pet:animal,
  wear:clothes}`——hint 行 CARDS.theme 必须等于定约值（build 断言字面在场、
  verify ⑥ dimtarget 分支全枚举、pycheck 律断言、structWhy 'dimtarget' 校验四重）。

**维度三·跨维二级题 pick（ch4，rows 15-19）**：
- 反向题：目标格已知（题面句名目标格+目标格 .target 恒亮脉冲=题面已知量非答案
  泄漏，答案是三张卡中的正确卡），三卡跨维挑书盘=答案卡+两张他维干扰卡（表内固定
  候选集，干扰主题互异且≠目标——恰一张属目标格为可证定约；盘序每关 seeded 打乱，
  answer=盘内下标）。
- 5 行目标分布 food×2/clothes×1/animal×1/vehicle×1（build 静态断言）；候选集字面
  逐条 build 断言（['apple','rabbit','train'] 等 5 组）。
- 干扰卡点=wrong 弹回（miss 计分+错链同构）；**点干扰卡不播词**——本款卡词无键，
  天然满足基线「干扰词无键不点」规则（verify ⑤b 键宇宙断言：__voiceHist 全史 ⊆
  封闭 **16** 键集（lb 13+core 3）——r48-fix m1 勘正：原写 14 系段一 12+2 中间态笔误）。
- 双入口同构：engTapCard/engTapCard 镜像 engTapShelf（题型不匹配=null）；uiTapCard
  镜像 uiTapShelf（演出锁/豁免窗 guard/身份守卫 token/miss 梯度/答案级 breathe=正确卡）。

## §R2 卡池与主题归属（独立真值表）

32 卡×4 主题各 8（封闭池，verify SPEC_THEME/pycheck THEME 同表独立硬编码）：
animal={cat,dog,cow,chick,goldfish,elephant,rabbit,bird}；
food={apple,carrot,bread,egg,milk,banana,rice,cake}；
clothes={coat,shoe,hat,skirt,glove,scarf,sock,sweater}；
vehicle={car,bus,bike,plane,ship,train,ambulance,firetruck}。
普通卡主题互斥（池内无歧义）；维度行归属=DIM2_TARGET 裁定后唯一格（§R1）；pick 行
恰一张属目标格。answer：sort=shelf.indexOf(卡主题)；pick=盘内唯一属目标格卡下标
（verify/pycheck 均独立推导复算，禁读 quiz.answer 直比）。

## §R3 生成规则与 rnd 消耗序列（pycheck 位级复刻依据）

seed=mulberry32(flat*7919+837)（本款常量 837 不变）。**消耗序列（R48 扩程，全序列
=pycheck 对拍依据）**：
1. 生成关（flat≥20）先抽 `dch=ri(rnd,1,4)`（第一个随机数，先取数保确定性；
   静态关不抽，dch===ch）；
2. 生成关本章池无放回抽 5：`pool=rows[(dch-1)*5..dch*5-1]`，5 次
   `splice(ri(rnd,0,len-1))`（len=5,4,3,2,1；静态关不抽，rows=章池 rotate
   `base+(lv+k)%5`）；
3. 格序 shuffle（4 元素 Fisher-Yates=3 次 rnd）——静态/生成关同律；
4. 按题序逐题：pick 行盘序 shuffle（3 元素=2 次 rnd），sort 行不消耗。
rnd 流 vs baseline：**全 40 关消耗序列变化**（域 2→4 使格序 shuffle 从 1 次变 3 次；
生成关 pick 行新增盘序消耗）——见 §R9 谱变化声明。

## §R4 题库 20 行全表（真值源；verify SPEC_QUESTIONS/build/pycheck 三源逐条对账）

| row | 章 | 题行 | 题面句 |
|----|----|------|--------|
| 0 | ch1 | cat/none | 它住哪一格呢 |
| 1 | ch1 | apple/none | 同上 |
| 2 | ch1 | coat/none | 同上 |
| 3 | ch1 | car/none | 同上 |
| 4 | ch1 | chick/farm | 它住在农场里 |
| 5 | ch2 | goldfish/pet | 它是我们的好朋友 |
| 6 | ch2 | banana/eat | 我们能吃它 |
| 7 | ch2 | hat/wear | 天冷了要穿上它 |
| 8 | ch2 | cow/farm | 它住在农场里 |
| 9 | ch2 | rice/eat | 我们能吃它 |
| 10 | ch3 | egg/eat | 我们能吃它 |
| 11 | ch3 | dog/pet | 它是我们的好朋友 |
| 12 | ch3 | scarf/wear | 天冷了要穿上它 |
| 13 | ch3 | milk/eat | 我们能吃它 |
| 14 | ch3 | rabbit/pet | 它是我们的好朋友 |
| 15 | ch4 | pick food cards=[apple,rabbit,train] | 帮食物格挑一本新书 |
| 16 | ch4 | pick clothes cards=[scarf,dog,bus] | 帮衣物格挑一本新书 |
| 17 | ch4 | pick animal cards=[elephant,bread,shoe] | 帮动物格挑一本新书 |
| 18 | ch4 | pick vehicle cards=[plane,milk,hat] | 帮交通格挑一本新书 |
| 19 | ch4 | pick food cards=[carrot,bird,sweater] | 帮食物格挑一本新书 |

章谱（CH_LEN=5，flat=关号）：ch1=flat0-4（rows0-4）/ch2=flat5-9/ch3=flat10-14/
ch4=flat15-19；生成关 flat20-39（dch=ri(rnd,1,4)，池=本章 5 行）。静态 20 关覆盖
全 20 行各恰 5 次（verify ⑥ coverOk+pycheck 律断言）。
章提示（CHAPTERS.hint=预告下一章，家族 F 禁右移；GEN_HINTS[k]↔dch=k+1）：
1=「听一听提示，想一想它住哪一格」2=「有些书有两个家，听提示再放哦」
3=「反过来，帮书格挑一本新书啦」4=「新的书来啦，继续帮它回家」；
GEN_HINTS=[四个书格，看清标签牌/听提示，想想它是哪一类/两个家的书，听提示再放/
帮书格挑一本新书]。

## §R5 钩子契约（window.LB 真实页同暴露，b29 坑⑥）

quiz getter 双题型：sort——{kind:'sort',card,label,shelf(4),hint,say,sayKey,answer
=正确格下标,step,miss}；pick——{kind:'pick',target,cards(3 盘序),answer=盘内正确
卡下标,label:'',hint:'none',...同基}。tapShelf(i)/tapCard(i) 题型不匹配或越界=null；
autoSolve 双题型分流（`q.kind==='pick'?await uiTapCard(q.answer):await
uiTapShelf(q.answer)`）。答案体定位 answerElOf：sort=正确格/pick=正确卡（30s 答案级
救援 breathe 用）。stage 指针分流：.shelf-slot→uiTapShelf/.tray-card→uiTapCard。

## §R6 窗数学（演出时序，est 上界口径——r23 P2-1 红线：est 禁当实测入驻）

- estMs=n×345+600（b25 定版全字符口径，标点计入）。
- 题面句窗（presentQuiz=ENTER_MS 400+estMs+300，家族 T 动态）：普通句 6 字
  estMs 2670→窗 3370；维度句 5-8 字 estMs 2325-3360→窗 3025-4060；pick 句 9 字
  estMs 3705→窗 4405。
- 确认链 CELE_WIN=1836=lb_right 1536+300 精确；演出锁=SHELVE_MS 1000+1836=2836。
- 错链豁免窗 WRONG_CHAIN_WIN=4170=lb_wrong 1728+150+lb_hint 1992+300（真时钟）；
  首错弹回锁 BOUNCE_MS=1100≤1878（b37 R3 留「对选放行」活跃段）；豁免窗 guard：
  窗内错点吞 false 不计 miss/正确放行/窗后二错照计（miss≥2 答案体 breathe 可达）。
- 方向级反馈=错链播毕重读题面句（hintResayTimer=WRONG_CHAIN_WIN+60；q 未答未换关
  才播，防叠音/串题）；救援双锚 14s 方向级（lastDir 独立节流不重置 lastAct）/30s
  答案级（answerElOf breathe+重播）。
- 教学 watch 分账 3276+(400+2670+300)+800+320+2836=10602≤16000（单步演示款）。

### §R6b 段二实测窗复核（2026-09-22 注册后；真值源 F:/Cache/temp/r4789_clip_ms.json
mutagen 口径——页内 Audio 实测（verify ① durs）与 mutagen 逐键一致，偏差 0）

| 键 | 实测 ms | estMs 上界 | 题面窗 400+est+300 | 实测≤est | 余量 ms |
|----|---------|-----------|-------------------|---------|---------|
| lb_d2_farm | 2064 | 2670 | 3370 | ✓ | 606 |
| lb_d2_eat | 1752 | 2325 | 3025 | ✓ | 573 |
| lb_d2_pet | 2256 | 3360 | 4060 | ✓ | 1104 |
| lb_d2_wear | 2568 | 3015 | 3715 | ✓ | 447（最小） |
| lb_pick_animal | 2688 | 3705 | 4405 | ✓ | 1017 |
| lb_pick_food | 2664 | 3705 | 4405 | ✓ | 1041 |
| lb_pick_clothes | 2664 | 3705 | 4405 | ✓ | 1041 |
| lb_pick_vehicle | 2760 | 3705 | 4405 | ✓ | 945 |

- 全 8 键实测 ≤ estMs 上界 ≤ 题面窗（est 上界口径成立——§R7 estMs 列非泄漏）；
  段一口径 lb_pick est 3705 vs 实测最大 2760=大余量（945ms）。
- 错链窗 4170 只含 lb_wrong/lb_hint（旧键，注册无关不变）；**错链内无 lb_d2 键**；
  错链播毕重读题面句（hintResayTimer=WRONG_CHAIN_WIN+60 后播 q.sayKey，可为
  lb_d2_*/lb_pick_*）在错链窗外播放——无窗重叠。教学延窗/确认窗素材全旧键不变。

## §R7 新键清单（8 条，段一**只设计不注册**；三源一致对账锚）

| 键 | 文案 | 字数 | estMs 上界 | 用处 |
|----|------|------|-----------|------|
| lb_d2_farm | 它住在农场里 | 6 | 2670 | 维度句 farm（→animal） |
| lb_d2_eat | 我们能吃它 | 5 | 2325 | 维度句 eat（→food） |
| lb_d2_pet | 它是我们的好朋友 | 8 | 3360 | 维度句 pet（→animal） |
| lb_d2_wear | 天冷了要穿上它 | 7 | 3015 | 维度句 wear（→clothes） |
| lb_pick_animal | 帮动物格挑一本新书 | 9 | 3705 | pick 题 animal |
| lb_pick_food | 帮食物格挑一本新书 | 9 | 3705 | pick 题 food |
| lb_pick_clothes | 帮衣物格挑一本新书 | 9 | 3705 | pick 题 clothes |
| lb_pick_vehicle | 帮交通格挑一本新书 | 9 | 3705 | pick 题 vehicle |

- 前缀占用实查（2026-09-22）：manifest 无 lb_d2_*/lb_pick_*（grep 0 命中）——
  未注册状态与段一口径一致。estMs=est 上界口径，注册后主线实测复核 TODO——
  **已销（§R6b：全 8 键实测≤est，页内 Audio 与 mutagen 逐键偏差 0）**。
- 未注册期行为：core voice.play 落空=静默+console warn（Task#46 已移除
  speechSynthesis）——hint-line 文字承载题面真值（renderQuiz 恒写 q.say，r37/r44
  先例）；verify stub 照记键名（__lastVoiceKey 含 lb_d2_*/lb_pick_*）——
  **已销（段二起 8 键在册真实注入，静默期结束）**。
- **三源一致**：①本表 ②game-data.js DIM2_KEYS/PICK_KEYS+DIM2_HINTS/PICK_HINTS
  字面（build.py 断言 8 键名+8 句字面+字数 5/6/7/8/9 静态验算）③build 注入断言
  （n_clips==12 当前在册口径；注册后 12→20 联动改）——三源键集/文案逐字面对账——
  **③已销账更新：n_clips==16（§R0 段一预估 20 未计 lb_dim 退役；实收 12-4+8=16）**。
- **lb_dim_* 4 键（T46 注册）退役归主线段二**：代码已不引用（grep 仅注释 1 处），
  manifest 仍在册仍注入（计数含在 12 内）；主线段二注册新键时一并退役——届时在册
  lb_ 9-4+8=13 条+core 3=16（以主线实查为准）——**已销（manifest 清退+mp3 删除，
  段二实查 manifest libr 16 条 0 个 lb_dim_* 在册；build.py 加退役键回流防呆断言）**。

### §R7b 段二注册销账（2026-09-22，主线操作+段二联动终态）

- 8 新键已注册合成：manifest 5459→5517（ok=8 fail=0，主线交付）；mp3 全落库。
- lb_dim_farm/eat/pet/wear 4 旧键已退役：manifest 清退+mp3 删除（代码孤儿——
  维度句改版 lb_d2_* 后零引用）。
- 在册终态 16=lb_ 13（5 通用+lb_d2 4+lb_pick 4）+core 3（manifest 实查对账）。
- 联动改动：build.py LB_KEYS/n_clips 12→16+退役键防呆；verify SPEC_DUR 换
  lb_d2_*/lb_pick_* 实测值（真值源 r4789_clip_ms.json）+keysAll.length 16+
  lb_dim 前缀禁入断言；§R0/§R7/§R10 TODO 全销。

## §R8 六门禁数字

**段二重跑（2026-09-22，注册联动后自测全绿——当前真值）：**

| 门禁 | 结果 | 数字 |
|------|------|------|
| build.py 双跑幂等 | PASS | md5=680ffd017c6f03147cc0549c17c34904 ×2 一致；522234 bytes（493555 chars）；clips 16 条 |
| VERIFY 双视口 | PASS | 12/12 @1280×800 + 12/12 @800×1180，0 pageerror；布局 sims 全绿（格/盘卡 ≥96）；① durs 实测 13 键与 SPEC_DUR 逐键偏差 0 |
| _selftest.py | PASS | 27/27（verify 复跑/2a 真实 sort 流+错格+2 星/2b 教学链/2c 冲突章/2d pick 章+干扰卡错击/2e 双视口+截图非空白/离线+0 pageerror） |
| _r48_pycheck.py | PASS | 位级对拍 40/40 关 200 题逐字段；律断言全过 |
| gate_common38.py libr LB | PASS | 3/3（G1 verify 复跑 12/12/G2 教学链+通关+写档 stars=3/G3 clips n=16 miss=[]） |
| 谱投影复跑 | PASS | 段二 post2 vs 段一 post：r48-post.json md5 c447bd3e 逐字节相等、r48-post-full.json md5 59bb4c70 逐字节相等——注册零触 rnd 流（script[2] 零改动）实证 |

段一原值留档（md5=5c497c7caed2296dff39eac00bec7f5c，453311 bytes，clips 12 条，
G3 n=12，谱投影 post vs baseline 结论见 §R9）——段二重跑覆盖为上表。

分布断言下界独立推导（r39-bis 纪律）：sort 答案位 4 桶期望 140/4=35 取半 17；
pick 盘序位 3 桶期望 60/3=20 取半 10；pick 目标=行 rotate 数学下界（每行恰现 5 次
可证非统计）→ 每目标 ≥5（food 双行→≥10 实得 24/12 分布与行分布一致）。

## §R9 谱变化声明（rnd 流）

- **rnd 流全 40 关变化**：域 2→4（格序 shuffle 消耗 1→3 次）+生成关 pick 行盘序
  shuffle（每 pick 题+2 次）——baseline 与 post 无任何一关 quizzes 全等（full 对拍
  0 关全同）。种子与 dch 通道不变：flat20-39 dch 与 baseline 全同（首随机数不受
  后续消耗影响）；flat10-19 格序字节级保留（v1 该章已 4 格，shuffle 前 3 次消耗
  序列不变）；教学迷你关（flat=-1，非 seeded 通道）字节级保留。
- flat0 q0 锚面：card=cat/hint=none/say=它住哪一格呢/sayKey=lb_hint/label=小猫/
  theme=animal 逐字节同 baseline；shelf 2→4（域扩展必然面）；answer 随格序重导
  （1→2，仍=shelf.indexOf('animal')）。

## §R10 披露与登记（自登记风险项）

1. ~~**8 新键未注册（段一静默期）**~~：**已销（2026-09-22 段二）**——8 键注册注入
   （manifest 5517），verify ① durs 实测与真值源逐键一致；实测窗复核全过（§R6b）。
2. ~~**lb_dim_* 4 键滞留注入**~~：**已销（2026-09-22 段二）**——manifest 清退+mp3
   删除；build/verify 双侧退役断言（clips 内 lb_dim_* 禁回流+keysAll 前缀禁入）。
3. **verify ⑤b .miss 采样窗**：BOUNCE_MS×SPEED=132ms（verify 提速）内采样 60ms
   ——窗窄依赖 SPEED=0.12 常量；若调速须同步核该采样点。
4. **教学迷你关第二题（row1 apple）构造占位**：永不游玩（watch 演示题 0 后直接
   turn 单题关）；row 选择约束=主题∈两格迷你书架 {animal,food}。
5. **pick 目标分布非均匀**（food×2 行）：设计选择（食物主题卡池最丰富），下界断言
   按 ≥5 收口；跨维干扰集已验三主题互异。
