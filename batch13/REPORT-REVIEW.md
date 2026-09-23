# batch13 三款独立反方审查报告（代落：审查者只读，父会话转誊）

审查对象：money/wordprob/grid 三款 _src + SPEC-BATCH13 §0 25 条对照 + 同族先例（batch12/divide、batch5 M1、core.js）
方式：只读静态审查（未实跑 verify；运行态以复验为准）

## 结论

fatal 0 / major 2 / minor 8。**修复后放行**。Major 集中在 wordprob 教学演示 no-op 及其验证盲区；money/grid 无阻断项。

## major

**M1 wordprob 教学"看"阶段演示答题是静默 no-op（§0.6 违约）**
- 证据：`wordprob/_src/game-main.js:274` tutorialWatch 设 `state.demo=true; state.locked=true` → `:282` 调 `uiPick(q.answerIdx, true)`，但 `:153` uiPick 守卫 `if (!cur || state.locked || state.won || (state.demo && !demo)) return false;`——`state.locked` 项无 `&& !demo` 豁免，调用恒返 false。
- 同族对照（证明漏写非家族行为）：money `game-main.js:449-451` 演示前显式解锁；grid `game-main.js:284` uiCell 守卫带 `(state.locked && !demo)`；batch12/divide `game-main.js:431-433` 同 money。
- 影响：教学 watch 期幽灵手指按压正确卡但卡片不变绿、无音效、不推进——演示没有演示"答对"。教学交接与后续游玩不受阻。
- 修复：(a) uiPick 守卫改 `(!cur || (state.locked && !demo) || state.won || (state.demo && !demo))`（对齐 grid）或 (b) 演示前临时解锁（对齐 money）。改后 rebuild。

**M2 wordprob 三道验证均放行 M1（自检有效性缺口）**
- 证据：`game-verify.js:15` 注释声称"demo 答对"但 `:232-247` 断言只有 watch/turn clip、`tut==='help'`、重发后 `step===0/miss===0`（全是重发初态）；`_selftest.py:184-185` 只断"点击被吞 step==0"（demo no-op 与正确吞入不可区分）；`batch13/verify_one_wordprob.py:134-146` 同。
- 修复：verify ⑤ 断言演示效果（演示 uiPick 返回值非 false / optEl(answerIdx) 曾挂 .right / 演示后 step 曾为 1）。与 M1 一并修后重跑三道门禁。

## minor

| # | 问题 | 证据 | 修复 |
|---|---|---|---|
| m1 | 三款 locked/demo/won 期点题面卡 #prompt-chip 零反馈（§0.16/batch12 m4 未覆盖主视觉区） | money `:498-503,531` / wordprob `:336-341,350` / grid `:563-568,577` chipEl handler 早退静默 | chipEl 早退分支补 sfx('pop')，三款同修 |
| m2 | money 找零 TTS 兜底整句病句（"的东西"重复/孤立"元"/阿拉伯数字） | `money/_src/game-data.js:72-74` qSpeech change 分支 | 改与 quizParts 同构（numCn+qjiao+qpay3） |
| m3 | 答错晃动窗（480/520ms）不锁输入，快速连点一次错记多次 miss（星级受损） | money `:272-279,315-324` / wordprob `:182-192` / grid `:302-310,338-347,383-395` 无 locked；对照 batch12/column `:225-228` 已修 | 错分支 await 前 locked=true 后复位（照 column），三款修 |
| m4 | 救援钟重置口径三款不一致（money 放币重置/grid 合法步重置/wordprob 仅答对） | money `:219` / grid `:398` / §0.7a 字面"只被正确推进重置" | 产品定版：money 放币/移币去重置（纯探索）；grid 合法移动保留重置（移动=推进的物理形态）并 SPEC 注明例外 |
| m5 | money verify 答案分布阈值失真（idxDist 只统计 change 题 ~100 条，`<200*0.6=120` 恒不可触=准 vacuous） | `money/_src/game-verify.js:505` | 改 `idxDist[0] < (三项和)*0.6` |
| m6 | money 篮内占位文案对比度 2.26:1（§0.10 要求 ≥3:1） | `money/_src/head.html:91` .empty #B49A76 on #FBE9CF | 调深 #8A7B6C（约 3.9:1） |
| m7 | grid ch3 首题兜底模板 (1,1)→(1,3) 距离 3 违反 1 步域（latent 路径 ~0.87^60≈2e-4/关） | `grid/_src/game-core.js:139-147` vs `:172` genWalk(...,1,1,0) | wallsN===0 且 lenLo===1 时兜底改 (1,1)→(1,2) |
| m8 | SPEC §3"ch1 行列互异均匀分布"口径歧义（实现=25 格洗牌取 5=格子互异+均匀；非拉丁式行列互异） | SPEC:76 vs game-core:159-166 / verify:69-71,457 | SPEC 措辞定版"格子互异+行列值跨关全覆盖"（实现现状） |

## 已核查通过项（摘要）

§0.1 离线断言+sys.exit(3)；§0.2 stub 六 API+VERIFY 早退；§0.3 确定性同式双跑断言；§0.4 keyOf 1 基+dayEnd nextHint(lim-1) 三款一致；§0.5 sayW ===2 三态实测（grid 段独立计数）；§0.6 交接单通道/接力 qTimer 2s+清遗留；§0.7 首错不 pulse；§0.7a 错点不重置（例外见 m4）；§0.8 getter 拷贝无死字段；§0.9 触摸目标全达标；§0.13/14 Web Audio+星级永不为 0；§0.17 干扰互异禁 0 负独立复算（干扰池边界 answer=1/2×2 恒≥3）；§0.18/23/24/25 语音链闭环（manifest 逐条一致+正则提取+每游戏数词副本+正常游玩不触达 TTS）；§0.20 底栏门+身份守卫；§0.21 救援视觉重现非语音-only；§0.22 吞输入 pop（例外见 m1）；数学正确性（money 半元整数化+可凑性双保险+找零差≥1.5（ch4）/wordprob 四运算独立 refAnswer/grid BFS=最短路断言）；竞态（段锁双拦/教学重玩门）；产物同步（wordprob html 与 _src 一致）。

## 未覆盖

未实跑 verify/selftest/回归（运行态以复验为准，尤其 M1/M2 修复后 wordprob 全量复验）；SVG 逐像素重叠未目检（money 无截图目录）；多点触控并发；音频实听；batch13/index.html 与 verify_entry.py 未深查。

置信度：高（M1 三重代码证据+两同族对照；M2 三处断言原文为证）。
