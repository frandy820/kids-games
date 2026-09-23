# SPEC-R19-MEMORY — memory 记忆翻牌配对 难度改造定版（batch2 r19）

款目：memory 翻翻找朋友（batch2，离线单文件 HTML5，小兔子 IP，KIDS core v1.0）。
背景：审计判现难度 4 岁级偏易（纯轮廓匹配捷径 + 无工作记忆负荷 + 数字对无数感目标）。
本 SPEC 为 r19 老结构重建（照 kitchen-rhythm r18 范式）+ 难度改造定版真值源。
产物：`batch2/memory/_src/` 七件套 + `build.py` 拼接出 `memory/index.html`（verify/poke 页内嵌）。

## 0. 结构与流程

- `_src/head.html`（CSS+DOM，body 并入）+ `game-data.js`（图案/关表/常量/语音表）+ `game-core.js`（纯引擎，禁 DOM）+ `game-main.js`（主逻辑）+ `game-verify.js`（第 4 script 块自检）+ `build.py`（静态断言+拼接）+ `_spec_calc.py`（python 复算器）；根 `_selftest.py`（playwright 行为级自测）。
- `python batch2/memory/_src/build.py` → `memory/index.html`（幂等：双跑 md5 一致，无时间戳）。
- 门禁：`?verify=1`（17 单元自检，title=VERIFY PASS 16/16——注：单元计数 16 组，patterns 与 levels40 等合并计数见 verify 源码 ok() 调用数）→ `python _selftest.py`（66 项行为级）。
- 老 `build/` 目录改名 `build_legacy/` 保留备查，不参与构建。

## 1. delta① 图案相似化干扰（防轮廓匹配捷径）

- 图案池 19 种 = 8 近形族×2 员 + 3 单身（dog/elephant/banana）。`PATTERNS[k] = { name, fam, svg }`。
- 近形族（同族两员微差，孩子必须看细节不能认轮廓）：

| 族 | 员 A | 员 B（微差维度） |
|---|---|---|
| cat | cat（圆耳） | cat2（耳形微变） |
| bear | bear（蜜色） | bear2（色深微变） |
| apple | apple（带叶） | apple2（无叶） |
| flower | flower（5 瓣） | flower6（6 瓣） |
| star | star（5 角） | star4（4 角） |
| pear | pear（高） | pear2（矮胖） |
| frog | frog（睁眼） | frog2（眯眼） |
| orange | orange（光皮） | orange2（麻点） |

- `FAM_KEYS` 8 族索引；`FAM_MEMBERS[f]=[员A,员B]`；`SINGLE_KEYS` 单身。
- 关内干扰量 = `spec.twins`：恰 twins 个族「双员齐上」（每员自成一对——两张同面卡），其余对从「单身+每族至多一员」的填充池取（`fillPool` 每族至多一员，防非指定族意外共现）。verify 单元⑥对账：same 关实际同族双员共现族数 == spec.twins。
- 渐进：ch1 twins 0→3；ch3/ch4 twins 1→5；生成档 dch1-4 对应 twins 3/4/4/5。
- 失误两卡同族（非同面）→ 专属语音 `mem_twin`『它们长得很像，要看清楚哦』（10s 独立节流锚 lastTwinVoice）。

## 2. delta② 先看后翻（peek，工作记忆负荷）

- ch3 起全部关 peek=1；生成关 peek 恒 1。ch4 综合章 = peek + 高 twins + 补数混合。
- `peekFlow()`：指令语音先行（lead=estMs(peek 文案)=5085ms）→ 全牌依序亮出（60ms/张 stagger）→ 亮出窗 `PEEK_BASE + 对数 × PEEK_PER_PAIR = 800 + 对数×750` → 全部盖回；`seenIds` 保留全量（「翻回后再找」：支架/救援用 engKnownPair 有据）。
- flowToken 令牌防重入（换关/重玩作废在途 peek 流）；peek 期吞输入（家族 D bump）。
- 数学先验：亮出窗=对数×每对 750ms（3 对 3050ms → 10 对 8300ms），配 6-7 岁短时记忆广度渐进。

## 3. delta③ 补数配对「和为 10」（凑十前奏）

- ch2 全章 + ch4 混合 + 生成段一半。数字脸 = 大数字 + 十格点阵前 n 填充（`numFaceSvg(n)`，面域 {1..9}）。
- 封闭域恰 5 组：`COMP_PAIRS = [[5,5],[4,6],[3,7],[2,8],[1,9]]`；无 (5,5) 变体 `COMP_PAIRS_NO5` 4 组（生成档 dch≥3 用，纯互补面）。
- 渐进：ch2 内 2 对((5,5)+(4,6) 桥接入门)→3→4→5 对；生成档 dch≤2=5 对、dch≥3=4 对。
- 统一配对语义：`cards[i]={id,pairId,face,state}`，同 pairId 即配对（same 组内同面/sum10 组内互补）——引擎 engJudge 一套通吃。
- verify 单元⑤：全部 sum10 关（静态 6 + 生成段动态筛）组内两面和恒 10、域 {1..9}、无重复组、5 对关含 (5,5)。

## 4. delta④ ch3+ 反退化 + 关表

- 静态 24 关（4 章×6，`CH_LEN=6`），生成关 flat≥24 无限。`LEVEL_SPECS` 24 行 [r,c,mode,twins,peek]；章 dch=min(4,ch)。
- 生成关：`mulberry32(flat*7919 + MEM_SEED)`，`MEM_SEED=1056`（扫描定值：flat24-39 四 dch 各 4 次+双模式各 8 次；候选 940/1056，取带内 1056）。消费序：先 `dch=ri(1,4)` 后 `mode=ri(0,1)`。same 档 {dch1:[4,4,3], dch2:[4,4,4], dch3:[4,5,4], dch4:[4,5,5]}；sum10 档 dch≤2=2×5 对、dch≥3=2×4 对；peek 恒 1。
- 40 关全表 [mode,r,c,twins,peek,pairs,dch,modeled] 见 game-verify.js `SPEC_LEVELS`（`_spec_calc.py` python 位级复算 40/40 对账）。

## 5. modeled 认知时长模型（禁约数）

`modeled(flat) = Math.round(OPEN_MS + (peek ? peekMs(pairs) : 0) + pairs*2*DECIDE_MIN[mode] + END_MS)`

- 常量：OPEN_MS=1000，END_MS=2000，DECIDE_MIN={same:1500, sum10:2400}（补数档=翻看+求补两步），PEEK_BASE=800/PEEK_PER_PAIR=750，LEVEL_MIN_MS=12000。
- 锚：m0=flat0=12000；全 40 关 min=12000；max=41300（10 对 peek 关）。verify 单元⑮双钉 m0===12000 && min===12000；`_selftest.py` 文件头 python 侧 `modeled_py` 同公式独立 assert（双钉之二）。
- estMs 全字符口径四方同步（家族 T）：data `const estMs = s => s.length*345+600`（吃字符串）/ main 禁重复声明直接用 / verify `estMs = n => n*345+600`（函数域独立）/ build+`_selftest` lambda 断言。锚值：estMs(4)=1980、estMs(8)=3360、estMs(11)=4395、estMs(13)=5085。

## 6. 语音

| 键 | 文案 | 字数 | 状态（r19 定版：全部已合成注入） |
|---|---|---|---|
| mem_tut_watch | （老款沿用） | - | clip（实测 4104ms） |
| mem_tut_turn | （老款沿用） | - | clip（2256ms） |
| mem_hint | （老款沿用） | - | clip（2160ms） |
| mem_missmore | 没关系，再想一想 | 8 | clip（2688ms，主线 09-18 合成） |
| mem_sum10 | 找一找，两张合起来是十 | 11 | clip（3240ms） |
| mem_peek | 先看仔细，记住它们的位置哦 | 13 | clip（3384ms） |
| mem_twin | 它们长得很像，要看清楚哦 | 12 | clip（3144ms） |

- 错链豁免窗（契约 I）两模式档：same=`estMs(missmore.text)+300`=3660；sum10=`estMs(sum10.text)+300`=4695。**4 新键实测均短于 estMs 实算值**（2688<3360、3240<4395）→ 按定版决策：窗保持 estMs 口径不收窄（宁可宽不可掐断反馈），SPEC_DUR 钉实测。
- build clips 断言定版 `n==10`（mem 7+core 3，build.py 与 verify 单元⑫双卡）；键前缀对账只允许 mem_*/core_*；verify SPEC_DUR 10 键全表 ±60ms 对账。

## 7. 存档与迁移（键基 CH_LEN 5→6）

- 存档键沿用 `kidsgame_memory`（KIDS.init 参数不变，家族 C）；`sv.mem.tutSeen` v1 即同形沿用。
- 迁移 IIFE（先于 KIDS.init）：① v1 矛盾态检测——c=2..4 若 `lv[c+'-0']` 在而 `lv[(c-1)+'-5']` 缺（v1 键基分母 5 从不写 '-5' 键）→ 整档重置；② 脏键守卫仅判格式非法与关号越界（`lv>CH_LEN-1`），**章号上界放开**（生成关章号 ≥5 合法，禁整档 removeItem 吞生成关进度）；③ 校验失败不阻断启动。
- 自测三例：旧基矛盾重置 / 新基合法保留（含 '6-1' 生成关键）/ 脏键 '1-9' 重置。

## 8. 契约映射（13 条家族契约全落地，build.py 静态断言 + verify ⑬ 源码断言双保险）

A 双 `nextHint(lim-1)`（winFlow+启动，`Math.max(0,lim-1)` 日末停留，禁 null 实参形态）/ B 救援双锚 lastDir(14s 方向级)+lastAct(30s 答案级，方向级不重置 lastAct) / D 吞输入必配 `replayAnim(wrapEl(),'bump')` / E 行为分流先查 `sv.mem && sv.mem.tutSeen` / F 生成关预告 `GEN_HINTS[genLevel(f+1).dch-1]` 禁 `(ci+1)%4` / I 错链豁免窗=链句实长+300、startLevel 重置、救援 interval 让路（延伸：maybeScaffold 链窗内语音让路只给视觉支架——防支架句顶掉错链句）/ J 语义句 flat≥3 十秒节流（`now-lastWrongVoice>10000`；flat<3 必播）/ K rescueTick 命名函数+面板在场守卫 / N-Mj1 keyless TTS 段恒链尾（本款无 keyless 段，断言保留防后代加段踩坑）/ M verify 帧内容断言素材在场 / O button 显式 color:#4A3B2E / verify 独立第 4 script 块+`html.count('<script>')==4`+verify 读 `document.querySelectorAll('script')[2]` 检索游戏块（拼接串防自匹配）/ 完全离线（除 SVG xmlns 无任何 http(s)/外链）。

r18 三坑防回归：测试 stub 判 KIDS 用词法回退 `typeof KIDS !== 'undefined'`（KIDS 顶层 const 不上 window）；verify 墙钟>100s 无（本款 <10s）；键基已换配迁移 IIFE（§7）。

## 9. 验收门禁（八项全过；2026-09-18 二轮复验=4 新键 clips 落地后）

| 门禁 | 结果（二轮终态） |
|---|---|
| build.py ast 校验+双跑 md5 幂等 | PASS（0752f8fea34514037fe8b9f6f86e42ef 两次一致） |
| `_spec_calc.py` python 复算 40/40 对账 | PASS（seed1056 dch 4/4/4/4、mode 8/8、m0=min=12000） |
| `?verify=1` title | VERIFY PASS 16/16（clips n=10） |
| `_selftest.py` 行为级 | 66/66 PASS |
| 真实页 0 pageerror + 0 http | PASS（全程无离线违例） |
| clips 10 键在场+duration ±60ms | PASS（4104/2256/2160/2688/3240/3384/3144/3744/3528/6048） |
| 静态家族断言（build 输出即证） | PASS（A/B/D/E/F/I/J/K/N/MIG/SEED/PORT-CLS 9 行全等） |
| SPEC 落盘 | 本文件 |

## 10. 工程教训（r19 新增，后代批必读）

1. **python 复算 JS 位运算必须核对运算符优先级**：JS `t + Math.imul(...) ^ t` 是 `(t+imul)^t`（+ 高于 ^），不是 `t+(imul^t)`。本批首版 python 复算写错优先级 → 按错误序列选了种子 1007 → verify levels40 单元 14/40 不符揪出。教训：复算器与引擎的一致性必须有页面级对账门禁（本款 levels40 单元），不能只信 python 侧 SPEC 表自洽（首版 _spec_calc「自洽地」全绿，因为 verify 表就是从错误 python 抄的——同源互证假阳性）。
2. **verify 单元的关号清单禁按种子硬编码生成段**：sum10domain/twins 单元首版硬编码 flat24-39 的模式归属，种子换档即 NaN 崩。改 `for f in 24..40 if genLevel(f).mode==='sum10'` 动态筛。
3. **测试时序要避开游戏自身的异步演示**：教学吞输入断言若点「演示对」的卡，700ms 后演示翻牌会污染状态断言——点非演示对卡并压在 250ms 内读态。
4. **种档触达 flat N 需配 bonus 抬日限**：done 0-11 不加 bonus 时日上限 12 已满 → dayEnd 停留 flat11，是正确行为不是缺陷；要测 flat12+ 先 `bonus:{today:30}`。
5. **链豁免窗的语音让路要覆盖事件驱动路径**：救援 interval 让路不够——maybeScaffold（第 3 失误同步触发）也会 sayGoal 顶掉链句；窗内只给视觉支架。

## 11. 未尽事项

- ~~4 新语音键待主线合成~~ 已收口（2026-09-18 二轮）：主线 gen_clips.py 已登记+合成（manifest 2238，ok=4 fail=0）；clips 10 注入、SPEC_DUR 钉实测（2688/3240/3384/3144）、错链窗按 estMs 口径保持不收窄（实长更短）、三门禁复跑全绿。
- 存量脚本兼容已核：verify_batch2.py 种档 levels:{} 不触发矛盾重置（空档无 'c-0' 键）；t2_observe.py 只读；verify_voice.py 查旧 6 键仍在。
