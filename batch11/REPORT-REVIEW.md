# batch11 三款独立反方审查报告（core-adversarial-reviewer，2026-09-07）

> 审查对象：SPEC-BATCH11.md、三款 `_src` 6 类 18 文件、3 份产物 index.html、core.js（只读）、4 个外部脚本、manifest/verify_voice/_REPORT、两级入口页。只读静态审查，未运行脚本（运行验证由父会话负责）。

## 审查结论

**fatal 0 / major 2 / minor 8。总体：可继续，但 2 条 major 须修复并重验后收口。** 两处本批已实证修订（shadow `===2`、shp pulse/breathe 口径）核对为已完整落地；本次另找到**第三处未披露的 SPEC-实现分歧（M1，shp 生成关难度章）**与一处 §0.2 门禁字面违约（M2，shp verify stub 缺 voice.say）。

## major（必修）

### M1 shapeshome 生成关难度章未随机化，违反 SPEC §2 明文，且未按本批惯例披露
- 证据链：SPEC-BATCH11.md §2"生成关=随机章参数"；`shapeshome/_src/game-core.js:86-97` genLevel `dch = diffOfCh(ch)` 恒定循环取材、无随机分支（:12 注释自行改写口径）；对照姊妹款均随机：shadow `_src/game-core.js:77`（`flat < STATIC_LEVELS ? dch0 : ri(rnd,1,4)`）、sortsize `_src/game-core.js:73`。页面 verify 把偏差锁死为断言（`game-verify.js:39` 对 40 关 `L1.dch === (L1.ch-1)%4+1`；:101-103 `dchHist[d] === 10` 仅循环取材下恒真）；`shp/_REPORT.md` 以"dch 1-4 各 10 关"呈报未注记分歧。
- 影响：通关 ch4 后生成关 flat20-24 恒为 dch1（回落最易单维颜色）再逐章循环——与 SPEC 意图及姊妹款不一致；SPEC-实现-verify 三方对齐破坏（任务书要求排查的"第三处"）。玩法可玩、确定性未破，故不判 fatal。
- 修复：照 shadow 改 `const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);`（ri 先取数保确定性），同步改 verify 覆盖断言（静态 20 关各 5 + 生成关 dch∈[1,4] 全覆盖判据照 shadow 版）与 _REPORT 披露；重建+全 PASS+外部复验重跑。

### M2 shp verify stub 清单缺 `KIDS.voice.say`，违反 §0.2 明文枚举
- 证据链：SPEC §0.2"stub 全部发声 API（…voice.play/queue/**say**）"且"一项不满足=不收"；`shp/_src/game-verify.js:335-342` 仅装 note/sfx/speak/play/queue 五项而注释自称"stub 全部"；对照 shadow（:386-391）、sortsize（:375-381）均含 say。
- 影响：当前未爆事故仅因 core.js:87-88 `if (!save || !save.settings.tts) return;`（verify 页未 init→save=null→say 早退）——靠 core 副作用兜底而非契约 stub；core 判空逻辑一旦调整即变 verify 页真实放音/污染时序；三款 stub 不一致。
- 修复：补一行 `KIDS.voice.say = function () {};` → rebuild → verify 复跑（预期 50/50 不变）+外部复验。

## minor（记录处置）

| # | 问题 | 处置 |
|---|---|---|
| m1 | verify_entry.py 标签错置（'batch10/index.html' 实际加载 batch11 页） | 修标签 |
| m2 | shp miss≥2 高亮 `opt-pulse 1s ease 2` 播两遍 vs 口径"pulse 一次" | 改 `ease 1` 对齐 |
| m3 | sortsize 亮槽 s-num 重复 DOM（buildStrip 初始+fillSlot 再 append 叠放） | fillSlot 复用/先清原节点 |
| m4 | shadow/sortsize rabbit 守卫缺 `|| state.won` 分量（§0.20 三件门；shp 全） | 补齐（celebrate 遮罩已拦，无事故窗口） |
| m5 | shp 舞台空白轻反馈仅 home 卡+cardsEl，stage 其余留白无 §0.16 反馈（shadow/sortsize 为 stage 级） | 对齐 stage 级监听 |
| m6 | 蓝紫近似对成色弱于红橙对（色相差 56° vs 21°，承 batch7 先例色值） | 记录在案真机观察，不动色值（与 fishcolor 一致性优先） |
| m7 | shp tutorialWatch 写档无 `_save()=null` 守卫（shadow/sortsize 有） | 补 `|| {}` 守卫 |
| m8 | §0.22 页面 verify 仅 shp 有单元；shadow/sortsize 由外部脚本覆盖（H8/tut_case） | 记录备查，测试口径不一不阻断 |

## 已核查通过项（摘要）

- §0.1 单文件离线：三款 build.py 三重硬检查+6 条 data:audio、注入失败 exit(3)；§0.2 title/#verify-result/winFlow VERIFY 早退三款齐（M2 除外）
- §0.3 确定性：mulberry32 同式双跑断言在场；**无死循环**（shadow 干扰池恒足额 quad 去目标 5/round 恰 3/feat 4 均 ≥3、genItems guard 24、pickFrom 重试 8 全有界）
- §0.4：keyOf 1 基；三款 hint 均按"预告下一章"语义逐条核对；GEN 无双前缀；dayEnd 传 lim
- §0.5 sayW：shadow `===2`（页面第三错臂+外部 H9/H10b 实测）、sortsize `===2`、shp `>=2`（三选一等价）——三款无其他误传 force 残留
- §0.6 教学：三段齐；交接顺序链 shadow/shp qTimer/sortsize queue 两形态均允许；shp 演示临时解锁同步锚点（gate 与 locked=true 间无 await）
- §0.7/7a：零惩罚+again 防御层+救援钟只被正确推进/重听/重玩重置（外部 18s 窗判据非 vacuous）
- §0.8 钩子全拷贝无死字段；§0.9 双 viewport 96/64；§0.12 家长门两位数+parent_gate E2E limit=11 判据正确；§0.13 兜底链路成立（shp_wrong 无 clip→TTS）
- §0.14 星级永不为 0；§0.17 干扰互异无 0 负（shadow options 唯一/shp c|s 键唯一/sortsize 阶梯两两互异且展示必非单调）
- §0.18：manifest 实测 460 条；sha_/shp_/sor_ 各 3 条文案与 game-data 逐字一致；data:audio 各恰 6=verify_voice EXPECT
- §0.19 零文字：三款题面/选项无文字标签；sortsize 方向双冗余承载+槽内序数标记承 batch7 先例——不违
- §0.21：shadow/shp breathe 循环、sortsize 三连脉冲（+1.3s running 判据有区分度可拦单脉冲回归）
- shadow 专项：LIB 15 项与 SPEC 枚举一致（16→15 已披露）；ch1 跨组/ch2+ 同组；仅正确卡旋转（引擎/DOM 双对账+外部 H14b）；ch3 [F,T,T,T,T]、ch4 混合；CSS filter 剪影+.lit 还原
- shp 专项：维度爬坡逐题全量断言；ch3/4 第 2 题起恰一同色异形+一同形异色（ch4 必近似）；首题热身两维全错；ch4 tc∈{红橙蓝紫}
- sortsize 专项：SIZE_LADDER 逐值一致（obvious ≈1.50/close 1.17-1.19）；answerIdx 由独立重算器 expectIdx 验证（防同源假阳性）；q0 热身 big+每关 ≥1 small
- 验证体系反查：49/50/48 计数逐单元加总复核一致；shp 开场链恒真断言已改时间戳判据；外部四处修复在位
- 入口：主 index 5-6 岁区 batch11 三卡 href/标题正确；verify_entry fs 直查逻辑正确

## 未覆盖与残余风险

未运行任何脚本（只读约束，运行时证据由父会话实跑）；_selftest.py×3 未逐行审；真机 iPad/触摸/TTS 听感/5-6 岁真人可用性未验（sortsize ch4 相近档 1.18、shadow 旋转剪影、shp ch4 近似色叠 m6）；外部未覆盖 shadow flat17/shp flat15 真实 pointer 通关（引擎直驱+hook 已覆盖）；M1 若走随机化须回归 flat≥20 全量生成断言（shadow 版判据可复用）。

## 置信度

高（M1/M2 源码行级直接证据+姊妹款可对照；minor 属一致性/口径类不依赖运行时判定）。
