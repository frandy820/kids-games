# batch8 三款反方审查报告（core-adversarial-reviewer）

- 日期：2026-09-07 ｜ 审查对象：neighbors / picto / worden（_src 源码+构建产物静态审查，不执行页面）
- 审查者只读（沙箱禁写盘），报告全文由父会话代落；修复处置节为父会话实施记录

## 审查结论

**fatal 0 / major 4 / minor 6；总体：架构与内容正确性基本过硬，但 worden 存在每关必现的开场语音切断（复验盲区），建议修复 M1-M3 后重验语音时序，M4 为流程债可并行补。**

## fatal 问题

无。

## major 问题（必须修复后重审）

**M1. worden 每关开场题面语音被 wen_hint 立即切断——听音关（sound2pic）开局 en 发音被切=开局不可解**
- 证据：`batch8/worden/_src/game-main.js:239` `renderQuiz()` → 内部 `:98` `if (!state.demo) qSpeak(q)` 先播题面（sound2pic 走 `queue(['wen_w_'+target, wen_q2])`，`game-main.js:55`）；紧接着同步执行 `:244` `sayR(VOICE.hint.key, ...)` → `KIDS.voice.play('wen_hint')` → `design/core.js:89` `play` 入口 `_stop()` 停掉上一条 audio 与 queue 链（`core.js:83-86`）。执行顺序保证题面/en 发音每次都被打断。
- 影响：每关必现（含重玩按钮、自动推进）；违反 §0.19"题面指令全语音承载"与 §3"听音题开题自动播发音"。不识字孩子在听音关开局听不到完整发音，只能靠 14s 救援或手动点喇叭兜底。**verify ⑥ 只 stub 计数调用发生**（`worden/_src/game-verify.js:166-183`）、外层复验 vlog 只记调用序列（`verify_one_nb_wen.py:17-20`），均检测不到"调用后被切"——这是复验盲区实锤。
- 修复建议：照 picto 形态（`picto/_src/game-main.js:218-219` `queue([hint, 题面])`）改为顺序播报；或 sayR(hint) 与 qSpeak 二选一拼接。

**M2. worden 教学交接语音时序破损**
- 证据：`worden/_src/game-main.js:260-262` 演示前临时 `state.demo=false; state.locked=false`——从解锁到 `uiPick` 内部 `state.locked=true`（`:175`）之间全同步无 yield，不构成输入漏洞；但 `demo=false` 使演示答对后 `:192` `renderQuiz()` 的 `:98` `qSpeak(q第二题)` 在教学"看"阶段提前插播第二题指令；随后 `:273-274` 重发关后 `renderQuiz()` 播的 q0 指令被同函数内紧接的 `sayR(VOICE.turn.key)`（`:274`）play→`_stop` 切断。对比正确形态 `picto/_src/game-main.js:248-249` 用 `queue([turn, q0指令])` 顺序播。
- 影响：新用户首次教学（每用户一次），"你来点一点"之前题面指令无完整播报，help 阶段首题无题面语音直到救援/手动重听。
- 修复建议：重发后改 queue([turn, q0 指令])；演示通道保持 demo=true 至 uiPick 返回（neighbors/picto 形态）。

**M3. neighbors 教学交接双通道叠音（数词 TTS 与 turn clip 同时播）**
- 证据：`neighbors/_src/game-main.js:318-322`——state 重置（demo=false）后 `renderQuiz()` → `:159` `speakQuiz(q0)`：`KIDS.voice.say(numCn(n))`（TTS 通道，立即出声）+ `qTimer` 850ms 后播 clip（`:71-77`）；紧接 `:322` `sayR(VOICE.turn.key)` 走 clip 通道。`core.js` 的 `play` 不 cancel 进行中的 TTS（仅 `speak` 内部 cancel，`core.js:116-123`），两通道叠播；850ms 后 q1 clip 又切 turn 尾。
- 影响：新用户首次教学，题面数词（"五"）被"你来挂一挂"叠音淹没——题面句式是"数词+'的邻居是几呀'"拼接（SPEC §1），数词听不清则题面语义不完整。
- 修复建议：交接改顺序链（turn clip onended 后再 speakQuiz），或数词也走 queue 拼接。

**M4. gen_clips.py batch8 三款词表/文案为手写副本，违反 §0.18"零手抄"门禁**
- 证据：`voice/gen_clips.py:176-180`（PICTO 20 字硬编码元组表）、`:191-193`（WORDS 24 词硬编码列表）、`:164-190`（三款指令文案硬编码）；对比同文件既有正则提取模式 `:13-18`（shop GOODS）、`:73-79`（pinyin）、`:103-107`（connect）、`:139-144`（words CHARS）。SPEC §0.18 明文"gen_clips.py 从源表正则提取（零手抄）"。
- 影响：本次逐条对账三方一致（SPEC 表 / gen_clips / game-data：picto 20 字 key-字-组词全对上，mu/mu2、yu/yu2、he2 冲突键正确；worden 24 词全对上；指令文案全对上），当前无运行时错误；但双源漂移无任何机制拦截——manifest 对账只验 key 存在不验文案一致，一侧改动另一侧不会失败。
- 修复建议：PICTO/WORDS/VOICE 改从各自 game-data.js 正则提取（照 wrd_ch_ 模式），至少加 manifest↔源表断言。

## minor 问题（可继续，须记录）

**m1.** neighbors 注释与数据不一致：`neighbors/_src/game-core.js:7` 写"dch3→9-20"，实际 `game-data.js:25` `STREET={3:[8,20]}`（为 10→9 空房左邻 8 亮号，行为正确，verify 也按 8..20 断言）。改注释防误导。

**m2.** neighbors `GEN_HINTS[1]='大号码房子找邻居'`（`game-data.js:19`）对应 ch6=dch2（少一号，n∈2-10，门牌域仍 1-10），文案与章型错位（10-19 大数字是 dch3）。建议改少一号语义。

**m3.** 救援钟 lastAct 的按钮边界三款两派：neighbors/picto 的 rabbitBtn+hearBtn+题面卡重置 lastAct（`neighbors/_src/game-main.js:334,348,355`；`picto/_src/game-main.js:260,273,281`）；worden 全部不重置（`:295` 注释明示，最严格符合 7a 字面）。两种均说得通但跨款不一致，建议统一口径。

**m4.** picto 答对组词 clip 与 1.9s 演出窗临界：`picto/_src/game-main.js:160` `wait(1900)` 后 renderQuiz 的题面 sayR 会 `_stop` 组词 clip；6 字文案按晓晓 -8% 约 1.7s，临界通过，mp3 首尾静音偏长时"X，YY的X"尾字被切。建议实测 20 条 mp3 时长取 max+余量。

**m5.** 三款 hearBtn 均无显式 `won||demo` 门（`neighbors/_src/game-main.js:347`、`picto/_src/game-main.js:272`、`worden/_src/game-main.js:305`），仅靠 winFlow/演示期 locked=true 间接拦（当前无实际漏洞）。与各自题面卡的门（worden qCardEl `:312` 有 won||demo）防御不对称，建议补齐。

**m6.** 章中天末 dayEnd 预告超前：三款 nextHint 语义="刚完成章的末预告"（如 `neighbors/_src/game-main.js:249-251`），dayDone 发生在章中（如 flat=5 完成 ci=1 → CHAPTERS[2].hint=预告第 3 章）时明天实际先玩第 2 章剩余。文案内容非错误、时点偏早，三款同形态。

## 已核查通过项

1. **确定性**：三款均 `mulberry32(flat*7919+13)`（`neighbors/_src/game-core.js:75`、`picto/_src/game-core.js:50`、`worden/_src/game-core.js:86`），内容生成无 Math.random 直用（core 仅 click 音效用 random，非内容）；verify 均断言同 flat 两次生成 JSON 一致。
2. **章号数学无软锁**：三款 keyOf/chOfFlat/diffOfCh 一致，`(ch-1)%4+1` 循环取材、进度章号单调；nextHint 参数=flat ✓。
3. **neighbors ±1 数学与 mode 一致**：plus=n+1（n 1-19）/minus=n-1（n 2-20）/mid=n+1（n 1-18，右锚 n+2≤20），与 structWhy（`game-core.js:124-135`）严格对齐；跨十专项 19→20 与 10→9 每关各 ≥1（`game-core.js:79-84` shuffled 取 2 不同位）；干扰项过滤非负非 0 域内互异 ✓。
4. **mid 两侧锚点亮号**：`refNums=[n,n+2]`（`game-main.js:82`）加 .ref 强调；实际全街非空房门牌恒亮（`game-main.js:106-107`），比 SPEC 更强；10→9 空房左邻 8 在 STREET[3]=[8,20] 域内恒亮 ✓（verify `game-verify.js:199-204` 亦断言域内邻恒亮）。
5. **numCn 1-20 读音**：`game-data.js:41-47` 与独立字表（verify `:241-249`）逐一相符且互异；11-19="十X"、20="二十"，跨十读音正确。
6. **picto 20 字库/组词/clip key 三方一致**：SPEC §2 表、`gen_clips.py:176-183`、`game-data.js:19-95` 逐条对账全对（含 mu/mu2、yu/yu2、he2 序号键）；形近对表 5 对全覆盖且邻接对称（`game-data.js:105-112`），dch3 干扰全 ∈形近对、dch1-2 干扰全非形近（structOk `game-core.js:113-133` 双向断言）。
7. **worden 24 词表与 wen_w_* key 对账一致**（`game-data.js:11-36` vs `gen_clips.py:191-196` vs manifest）；CONFUSE 6 对与 SPEC §3 一致且 cap/dot/look/lake/stop/head 均 ∉词库（构造层杜绝误播+verify `game-verify.js:44-51,85-98` 双断言）；en/zh 无 key 串线（en=wen_w_* per-key AnaNeural，zh=晓晓，manifest voice 字段区分）。
8. **§0.20 底栏守卫**：三款 replayBtn 均 `locked||demo||won` 门（`neighbors:340`、`picto:266`、`worden:300`）、rabbitBtn 均 `locked||demo` 门；**主答路径身份守卫三款齐全**（`neighbors:209,240`、`picto:128,161`、`worden:150,189`：`const run=cur` + await 后 `if(cur!==run)return`）；winFlow 后 setTimeout(proceed,3400) 期间 won+locked 全拦。
9. **救援钟 7a**：三款错点/空白/探索均不写 lastAct（worden 最严，`worden/_src/game-main.js:295,325` 注释明示）；idle=14000；救援内容=重读题面（speakQuiz/sayR(qKeyOf)/qSpeak）非通用催促 ✓。
10. **钩子拷贝非活引用**：NEB/PIC/WEN getter 返回 slice/map/字面量（`neighbors:419-420`、`picto:347-352`、`worden:377-379`）；verify stub 只替换发声 API 不改被测逻辑（worden ⑤⑥ 计数 stub 用后恢复 orig）。
11. **触摸目标**：主答案 ≥96（neighbors platebtn 118×132、picto opt 132×138、worden opt min178×150，竖屏 @media 仍达标）；SVG 图卡 ≥64（picto .pic 100/竖 90、worden svg 108/竖 98）；底栏按钮 ≥72；#prompt-chip/#q-card 均为 button ≥64。
12. **产物结构**：三款 index.html 各恰 3 对 script（core/clips/游戏段）、core 段与 `design/core.js` 同版（首行+settle/queue 特征在）、clips 以 `"key":"data:audio/mpeg;base64,..."` 注入且 key 齐（含 mu2/yu2/he2/wen_w 全 24）、无字面 `</script>`（build.py 硬断言+grep 仅 3 对闭合）、_src 与产物同步（抽查 worden:1254、neighbors:643/1206 等关键行一致）；manifest.json 三款 key 全存在（含无后缀的 pic_hint/wen_q4 等，`manifest.json:2231,2267-2279,2417-2435`）。
13. **语音四包装**：sayP flat<3 / sayR 不受限 / sayW flat<3 每错+flat≥3 10s 节流，三款实现一致且 verify 各自断言（picto `game-verify.js:112-140`、worden `:134-164`）。
14. **零惩罚**：错点灰掉 pointer-events:none 可重点、again 早退不计数、首错不 pulse（_miss≥2 才高亮）三款一致。
15. **结构化内容优先 HTML**：数字/汉字/英文单词卡均为 DOM 文本非 SVG text；问号旗的问号用 DOM（`neighbors/_src/game-data.js:65` 注释明示）。
16. **完全离线**：build.py 硬检查 http(s)/link/src/href（SVG xmlns 豁免）三款相同。

## 未覆盖部分与残余风险

- **静态审查未执行任何页面**：verify 实际 PASS 状态、布局实测（overflowX/getBoundingClientRect）、像素截图均未重跑，以前序复验为准；我只审了"复验断言能不能发现某类问题"，M1 即为断言设计盲区的实例。
- **音频时长未实测**：M1-M3/m4 的打断/截断判断基于 core `_stop`/queue 代码逻辑推断，clip mp3 实际时长未测（修复验证时需真实听或量时长）。
- **外层验收脚本**（verify_batch8.py / verify_entry.py / _selftest.py）只粗读 grep 关键断言，未逐行审其充分性。
- **core.js 作为参照真值源使用，本身不是审查对象**；其 celebrate/dayEnd 期间的 proceed 竞态、localStorage 异常路径等沿用既有形态未深究。
- **真实 TTS/Audio 自动播放策略**（iOS Safari autoplay 拦截→onfail 回退链）依赖运行时行为，静态不可验。
- 教学重发 `cur=genLevel(0)` 与玩家在 help 阶段快速点 replayBtn 的叠加（replayBtn 被 demo 门拦，help 阶段 demo=false 可点→startLevel 重置 tut='none'，教学 ghost 定时器 `if (state.tut==='help')` 自守卫 ✓）已查无坏路径，但极端连点组合未穷举。

## 置信度：高

（M1-M3 为代码执行顺序可直接推得的确定性缺陷；M4 有 SPEC 条文+源码双重证据；minor 项均附行号。主要不确定点集中在音频实际时长，已在残余风险声明。）

---

## 修复处置节（父会话 2026-09-07 实施与实证）

major 4 项全修 + minor 修 3（m1/m2/m5）；m3/m4/m6 记录在案不修。修复后三款 rebuild，定向实证 4/4 + **verify_batch8.py 复归 4/4 PASS**（worden 复归途中踩 3 个 verify 断言自身形态问题，见下）。

| 项 | 处置 | 实证 |
|---|---|---|
| M1 开场 hint 切断题面 | startLevel 引入 **quiet 标志**：renderQuiz 读题条件加 `!state.quiet`；开场改 `openingSpeak()` 顺序链——sound2pic `queue([wen_hint, wen_w_*, wen_q2])`，其余 `queue([wen_hint, q 指令])`（hint 不再 play→_stop 切断链） | flat5 开场 vlog=`Q:wen_hint,wen_w_rabbit,wen_q2` 三元素一次 queue，无独立 P:wen_hint ✓ |
| M2 教学交接时序 | 演示段 uiPick 前 `quiet=true`（演示答对换题不插播下一题指令）；交接段重发关后 `queue([wen_tut_turn, 题面])` 顺序链 | 交接链 `Q:wen_tut_turn,wen_q1` ✓；演示窗口内无第二题指令 ✓ |
| M3 neighbors 交接叠音 | 交接段 quiet=true + `sayR(turn)` 播完 2s 后 qTimer 接 speakQuiz（顺序链；turn clip ~1.5s < 2s 留白） | turn 先于题面 clip（vlog 时序）✓；watch 阶段 hearBtn 被拦 ✓ |
| M4 零手抄 | gen_clips.py PICTO/WORDS 改正则提取（`k:\s*'(\w+)',ch:,wd:` / `^\s{2}(\w+):\s*\{cat:'[^']+',zh:` + assert 20/24 互异） | manifest=419 与重提取对账零漂移 ✓ |
| m1 | game-core.js 注释 9-20→[8,20] | — |
| m2 | GEN_HINTS[1] '大号码房子找邻居'→'比它少一的邻居' | — |
| m5 | 三款 hearBtn 补 `won||demo` 门（watch 阶段实测被拦） | ✓ |
| m3 救援钟按钮边界 | 不修：两派口径（重置=奖励聆听行为 / 不重置=7a 字面最严）均说得通，worden 最严形态符合条款字面；统一口径留系列级裁决 | — |
| m4 picto 组词 1.9s 临界 | 不修：实测留待真机听感（无头无音频时长可测）；如切尾再放宽 wait | — |
| m6 章中 dayEnd 预告超前 | 不修：三款同形态（batch5-7 同在），系列级统一裁决项 | — |

**复归踩坑记录（verify 断言自身，非游戏缺陷）**：①worden ⑥ autoplay 旧断言只认 `qLog[0][0]='wen_w_*'`（单词在第 0 位），M1 修复后开场链单词在第 1 位 → 断言改三元素链；②startLevel 的 VERIFY 分支在 openingSpeak 前 return，verify 页开场链从不被记录 → 分支改 `if (VERIFY) { if (!freshTut) openingSpeak(); return; }`；③verify 页 KIDS 未 init，`KIDS._save()` 返回 null → 两处补 `|| { levels: {} }` 兜底；④startLevel(7) 的 auto2 断言 `p[0]==='wen_w_*'` 同为旧形态 → 改全元素包含 `p.indexOf('wen_w_'+q7.target)>=0`。四处全为断言滞后于行为修复，游戏逻辑零改动。修复后 worden VERIFY PASS 50/50。

**审查价值的实锤**：M1 类"调用发生但播出被切"无法被任何 stub 计数/vlog 序列断言捕获（断言只看得见调用看不见听觉结果）——静态执行顺序分析是唯一能抓到的手段，本轮 M1-M3 全部为该类别。
