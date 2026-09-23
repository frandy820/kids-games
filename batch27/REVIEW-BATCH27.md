# REVIEW-BATCH27 · 反方独立审查（ruler 测量小尺 / coin 硬币认钱 / notebird 音阶小鸟）

审查人：core-adversarial-reviewer（独立反方，默认不认同前序结论）· 2026-09-10
基准：SPEC-BATCH27.md（§0 家族契约 A-J + §0.64-66 + §1-3 + §4 实长表）+ batch21 §0（1-48 条）+ batch26 家族先例
方法：三款 `_src` 全文件逐行 + build 逐字节比对 + mutagen clip 实测 + SAPI Huihui 拼句实测 + playwright 无头独立 launch 单 page 串行（DOM/文本断言，不看图）+ fake-Date.now 时间线压缩取证
证据目录：`F:/claudecode/output/batch27-review/`（runtime1.json / runtime2.json / sapi_measure 数据 / 测量脚本 / wav）

## 结论总览

| 级别 | 编号 | 标题 |
|---|---|---|
| major | M1 | notebird 教学链真实页 26.1s 违反家族「教学 watch ≤16s」门禁，且 verify 断言口径与另两款不一致（掩盖真实值） |
| minor | m1 | 三款错反馈链 estMs 口径不一致（汉字数 vs 全字符数）；coin build 注释「16 汉字」实为 16 字符 |
| minor | m2 | notebird 教学顺序唱延窗 3400 vs 下界 3396，裕量仅 4ms（贴线） |
| minor | m3 | verify_batch27.py 三处弱断言/死代码（T3 ruler cmp 死代码、T3 notebird ch1 期望集错误靠时序偶然通过、T6 notebird oob 断言测错属性） |
| minor | m4 | batch27 目录残留中间产物（_probe×3、_selftest×2、_shots×7） |

**fatal 0 | major 1 | minor 4**。前序「门禁 3/3×3、复验 11/11×3、回归 7/7」复跑全部通过（三款 selftest VERIFY PASS 55/55、56/56、56/56，无 pageerror），核心教育真值与家族契约 A-J 活体全部成立；问题集中在 notebird 教学时长违约与验证口径/脚本质量层。

---

## M1（major）notebird 教学链真实页 26.1s，违反「教学 watch ≤16s」+ verify 口径不一致

**位置**：`batch27/notebird/_src/game-main.js` L358-402（`tutorialWatch`：watch clip → 900+2500 延窗 → **8 鸟顺序唱固定 8×1000ms** → 主线句 `wait(5800*SPEED)` → 重建题面唱窗固定 1300ms → ghost 800+320 → 演示演出窗 6000ms → 500 收尾）；`batch27/notebird/_src/game-verify.js` L191 `const tw = Date.now() - t0;`（**不折算**）+ L200 `tw <= 20000`。

**证据**：
- 真实页实测（runtime2 `F_tutorial_real_ms`，无预置存档自然走教学）：`tut='help'`、`demoR='right'`、**26.1s**，无 pageerror。
- 对照款口径：ruler game-verify.js L278 `const tw = (Date.now() - t0) / SPEED` + L282 `tw <= 16000`（折算真实页，实测 10192ms 合规）；coin 同（10375ms 合规）。notebird verify 页 watchMs=11348ms ≤ 20000 通过——**该 11348 是 verify 页原始毫秒（含 0.12 提速），不是真实页时长**；真实页 26.1s 未被任何断言覆盖。注释自陈「watch ≤20s」（verify 头 L14），但 20s 上限本身也是给 verify 页时间量身定的。
- 门禁出处：SPEC-BATCH21 §0 共同门禁列表明文「教学 watch ≤16s」（batch27 §0「1-48 条逐条适用」）；三款中仅 notebird 超限。

**影响**：6 岁孩子首次进入需静看约 26 秒才能操作（16s 门禁即为此场景设）；verify 双口径（ruler/coin 折算、notebird 不折算）使该违约对回归断言不可见，未来改动失去保护。

**修复建议（只给改法）**：二选一。
1. 缩短教学：顺序唱改 4 只关键鸟（do/mi/sol/do'，4s）或将主线句并入顺序唱段尾齐播，目标真实页 ≤16s；
2. 若确认顺序唱 8 鸟为不可让步的教学设计，则在 SPEC-BATCH27 §3 显式声明 notebird 教学特例豁免 + 把 verify 断言改为「真实页折算口径」（固定窗原值 + 可变窗/SPEED 之和 ≤ 上限），消除口径游戏。
维持现状（既超限又换口径）不可收。

---

## m1（minor）错反馈链 estMs 口径三款不一致；coin 注释字符/汉字失真

**位置**：ruler game-verify.js L78 `hanN`（只数汉字）；coin game-verify.js L430 `estMs(SPEC_GUIDE.silver.length)`（JS length 含全角标点）；notebird game-verify.js L51 `han`（只数汉字）+ L347；coin build.py L106 注释「estMs(引导句最长 16 汉字=345*16+600)」——silver 句实为 14 汉字+2 全角逗号=16 **字符**。

**证据**（SAPI Huihui 实测，`output/batch27-review/runtime 数据 + wav`，22050Hz 渲染）：

| 句 | 字符 | 实测 | ms/字符 | 链实长+300 | 豁免窗 | 裕量 |
|---|---|---|---|---|---|---|
| notebird GUIDE_HIGHER「左边的声音低，右边的声音高，再听一听」 | 18 | 5183ms | 287.9 | 2832+150+5183+300=**8465** | 9500 | 1035ms |
| coin silver「都是银色，要看大小哦，大的是一元」 | 16 | 4888ms | 305.5 | 2568+150+4888+300=**7906** | 9200 | 1294ms |
| ruler cmp_clip「回形针短，数得多也不一定长哦」 | 14 | 4053ms | 289.5 | 2880+150+4053+300=**7383** | 8500 | 1117ms |

实测全部安全（任务书担心的「notebird 9500 vs 9492 贴 8ms」按实测计不存在——SAPI 真实速度 288-306ms/字符，低于 345 保守系数）。但三款计数口径互异（含不含标点）属验证体系债：同一 estMs 语义三种算法，未来句子变动时各款保护强度不同。

**修复建议**：三款统一为「JS length 全码点 ×345+600」（最保守），verify 与 build 同步；coin 注释改为「16 字符（14 汉字+2 逗号）」。

## m2（minor）notebird 教学顺序唱延窗 3400 vs 下界 3396，裕量 4ms

**位置**：notebird game-main.js L361-362（`wait(900*SPEED)` + `wait(2500*SPEED)` → t=3400 才开始顺序唱）；build.py L96 `assert 900+2500 >= 3096+300`。

**证据**：not_tut_watch mutagen 实测 3096ms（零偏差）→ 3096+300=3396 ≤ 3400，裕量 4ms。当前成立；但该窗是「watch clip 播完再唱不撞头」约束，gen_clips 若重合成该句（时长 +5ms 级漂移）即破，且 build 断言同样贴线不会报警。

**修复建议**：延窗提到 3500（`wait(2600*SPEED)`），build 断言同步；三款同类「clip 实长+300」窗建议统一留 ≥100ms 垫。

## m3（minor）verify_batch27.py 三处弱断言/死代码（复验脚本同源陷阱）

**位置与证据**（`batch27/verify_batch27.py`）：
1. **L94-95 死代码+错误公式**：`ba, bb = RULER_BASE[a['id']] * RULER_UNIT[a['unit']] / 1, ...`、`tr = ba / RULER_UNIT[...] * RULER_UNIT[...]`——cmp 真长公式应为 `units×unitBase`，此两行算的是 `base×unitBase` 且除乘抵消；幸未被使用（真断言 L97 用 `lens=物品基准长`，公式正确），但误导后来者且属「断言与真值脱节」的潜伏形态。
2. **L60-78 notebird ch1 分支**：注释「点鸟只唱不判（tap 恒 false）」语义错误——ch1 点答案鸟=right（推进）、点错=free；期望集 `(False,'free',None)` 漏 `'right'`。实测通过是因为 `tap(q.answer)` 落在题面唱窗（700+300ms 固定不提速）内被 locked 吞返回 false——**靠时序偶然 green**：唱窗时序若变（提速/前移）该断言会误报 FAIL，或反向掩盖 ch1 判定回归。
3. **L199-201 T6 notebird oob**：`r3=='false'` 断言的是「新题唱窗锁定」（上一 tap 换题后 playQuizVoice 锁窗），并非「越界=null」；越界语义实际由游戏内 verify ⑤（非锁定态 `tapBird(99)===null`）覆盖，独立复验此条形同虚设。

**影响**：独立复验是第二道防线，三处使其对 ruler cmp 公式、notebird ch1 free 语义、越界返回族的独立保护弱化（游戏内 verify 有真覆盖，故无漏网缺陷，仅防线质量）。

**修复建议**：删 L94-95 死代码；ch1 分支改为显式 `wait(1300)` 过唱窗后分别断言 `tap(错)='free'` 与 `tap(对)='right'`；oob 在非锁定态（唱窗后）测 `tap(99)===null`。

## m4（minor）batch27 目录残留中间产物

**证据**（`os.path.exists` 清点）：`batch27/_probe_b27.py、_probe2_b27.py、_probe3_b27.py`（前序探针）、`coin/_src/_selftest.py、ruler/_src/_selftest.py`、`coin/_src/_shots/、ruler/_src/_shots/` 共 7 张 PNG。SPEC §4 结构清单为每款 6 文件；本批审查纪律亦约定 batch27 只留交付物+源+REVIEW。

**修复建议**：删除或移 `output/` 归档（_selftest 若为可持续回归资产应并入 verify 链并说明，而非散置 _src）。

---

## 无需修复项清单（查过没问题）

1. **clips 量化**：18 条（rul_/coi_/not_）mutagen 实测 vs SPEC §4 表全部零偏差（±0ms）；core 3 条在档。6 条 base64（rul_wrong/rul_q/coi_wrong/coi_right/not_wrong/not_q）与 `voice/clips/*.mp3` 字节全等。
2. **build 一致性**：三款 index.html 与 `head+core.js+clips+5 源文件` 拼接**逐字节全等**（python 复算）；完全离线（除 SVG xmlns 外无 http/link/src/href）；无字面 `</script>`。
3. **契约 J 活体（攻击面 3）**：真实页 flat10 点错，`speechSynthesis.speak`+`HTMLAudioElement.play` 双终点 spy（b26 口径，绕开公开 play/say）：三款链=wrong clip→语义引导句（ruler「回形针短，数得多也不一定长哦」按所点卡单位 / coin「不止这些，再算一算」按组合大小方向 / notebird「左边的声音低，右边的声音高，再听一听」）；连错 10s 节流第二次零播放、fake+11s 第三错链+语义句复播。语义句全程保留，未切通用 wrong clip。
4. **契约 I 活体（攻击面 6）**：错链豁免窗内救援零插入（错点后 1.4s 观察 0 读题，wrongChainUntil 守卫）；窗后救援恢复（fake+30s 方向级读题回来，runtime1 ruler rul_q）；**错窗外·豁免窗内点对=right+确认句打断链**（三款 step 推进、确认句 TTS 播出，runtime2 C_tap）——「只挡救援读题不挡主动点选」成立。
5. **契约 B 双锚活体**：方向级救援（idle 15s）触发后不重置 lastAct（runtime1 phase1 救援→phase3 答案级路径仍可达）；lastDir 节流锚独立工作（runtime2 phase3 fake+13s 未过 lastDir 窗正确不来）。
6. **notebird AudioContext 手势解锁链（攻击面 1）**：真实页无手势 pending=1 入队不报错（ctx no-ctx）→ playwright mouse 真手势后 flush 排空、ctx=running → 之后 play 直调不入队；任何 pointerdown 即触发 unlockFlush，_pending 上限 8 的丢旧策略在真实交互下不可达积压。合成音窗（700/300/1700）不乘 SPEED，build+verify 双断言，spy 时序 gap=1000ms/d=700 实测吻合；TTS 与合成音不同通道互不掐断（错链期间 sing 正常调度）。
7. **ruler 教育语义（攻击面 4）**：陷阱对 4 组真值按基准长独立复算全部正确（book|stick 3=6 vs crayon|clip 3=3；pencil|stick 2=4 vs eraser|clip 2=2；crayon|block 1=3 vs eraser|clip 2=2；book|block 2=6 vs pencil|clip 4=4）；每题数字-真值脱钩成立（答案数字≤干扰数字而真长更大）；ch3 五关每题皆陷阱对、两卡单位互异；count ±1±2 干扰互异且方向句 over/under 与所点值方向一致（verify ④ 双向断言）。GUIDE cmp 三句按所点卡单位给句，与 SPEC「按所点物品真值引导」语义等效（点 clip 卡→「回形针短…」、点 stick/block 卡→锚句），活体句正确——口径差异仅为 SPEC 文字描述粒度，非行为缺陷。
8. **coin 教育语义（攻击面 5）**：组合值独立复算 15/10/20 角全对；sameval 互指表 yuan1↔yuan1p 双向；ch3+生成关 dch3 近对必在（sameval 含 jiao1 卡 / combo 含「1角」文字卡）；硬币大小 r=34<42<50，题面 130px 与 sameval 82px 小卡渲染直径同序（DOM getBBox 68<84<100）；jiao1/yuan1 同银白 #DCE1E8、jiao5 金 #E8C069 与「都是银色，要看大小哦」引导句自洽；「两个五角，就是一元」进率句活体播出（runtime2 C_tap 确认句实录）；纸币四主色绿/紫/蓝黑/棕+大数字+「元」字三线索齐全。
9. **notebird 真值（攻击面 1 其余）**：频率表 8 音独立双录 ±0.5Hz；notes 升序=左低右高站位（perch 递增断言）；higher 音程 ≤2 度、相邻对占比 0.73（verify 聚合）；近邻干扰必含；find 判定窗=唱完才开（唱窗 locked 活体：verify ⑤ lockWin + runtime T6 演出窗吞点）；救援读题=重播题面音（听辨款语义正确）；ch1 free 特例点错不判不计 miss 不进 step、点对可推进（verify ⑩ + T3 autoSolve 通关），无困死路径（14s/30s 救援从最后交互起算可达）；星级语义未伤（ch1 恒 3 星=「0 错=3★」自然结果）。
10. **家族 F（攻击面 7）**：CHAPTERS[i].hint 预告 CHAPTERS[i+1] 语义（三款逐句核对：ruler「小棒和积木…」→ch2 换单位、coin「纸币…」→ch2、notebird「听一听，找唱歌的小鸟」→ch2）；GEN_HINTS[k]↔dch=k+1；生成关 nextHint=实算 `genLevel(f+1).dch-1`（24/29/34/39 对账）且禁 `(ci+1)%4`（build+verify 双静态断言）。
11. **家族 A/C/D 与共同门禁**：启动 dayEnd `nextHint(lim-1)` 恰 1 处 + winFlow `nextHint(null)` 双形态；存档键 `kidsgame_<game>` 带 `v:'1.0'`（三款真实页 localStorage 活体）；吞输入 pop+容器 bump；双错防重入 1000ms（fire-and-forget 二击 miss 只+1）；星级 0/1-2/≥3→3/2/1★ 永不 0（三档构造直测+UI 冒烟）；每关 5 题；确定性 seeded（同 flat 两次 JSON 全等，含生成关）；家长门两位数加法（core，R5 抽测）；日限 6/12（core calendar DAILY_NEW=6/DAY_CAP=2）；主答案 ≥96px/触摸 ≥64/对比度 ≥3:1 双 viewport overflowX≤0（三款 selftest 内含）；教学看帮独+`__xxDemoR='right'`（三款真实页活体）；题面重听按钮恒在场（notebird 🔊=重播题面音不占救援钟）。
12. **入口与可达**：主入口 81 卡、batch27 入口 3 卡、三款子页存在、两级 href 全可达；三款全部运行时无 pageerror。
13. **verify selftest 复跑**：ruler 55/55、coin 56/56、notebird 56/56（本次审查独立复跑 3 次一致）。

## 修复顺序（耦合关系）

1. **M1**（notebird 教学时长+口径）——若选缩短方案会牵动 m2 的顺序唱延窗，先定 M1 方向；
2. **m2**（顺序唱延窗 4ms 贴线）——与 M1 同文件同时序段，随 M1 一并改并同步 build.py 断言；
3. **m1**（estMs 口径统一）——三款 verify+build 各改一处，独立可做；
4. **m3**（verify_batch27.py 断言修正）——独立可做，改完复跑 R1-R3 确认 11/11 不回归；
5. **m4**（清理残留）——最后收尾，避免与上述改动混提交。

fatal 0 | major 1 | minor 4
