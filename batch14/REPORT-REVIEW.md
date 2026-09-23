# batch14 三款独立反方审查报告（2026-09-07，core-adversarial-reviewer；主会话代落盘）

## 审查结论

**fatal 0 / major 4 / minor 6。总体：可继续开发流，但 4 项 major 须修复后重审**（1 项功能竞态、1 项 §0 硬条违反、1 项渲染裁剪、1 项验证恒真断言）。三款整体架构、§0 二十七条绝大部分、教育设计与家族一致性质量较高；问题集中在新机制（对手钟竞态）与新渲染（等轴测包围盒）上。

---

## fatal 问题（必须停止并回退）

无。

---

## major 问题（必须修复后重审）

### M1 [multibattle] 对手钟超时落入错答晃动窗 → 提前解锁 + 旧题面卡对新题判分（竞态）

**证据**：`multibattle/_src/game-main.js`
- 错分支（228-238 行）：`state.locked = true; await wait(520 * SPEED); if (cur !== run) return r; state.locked = false;` —— 续体只有 `cur !== run` 身份守卫，**无题身份守卫**。
- 超时路径（79-99 行）：`onFoeTimeout` 设 `state.locked = true` → `engFoe(cur)` **推进 step（换题）** → `await wait(820 * SPEED)` 后才 `renderQuiz()` 重绘答案卡。

**推演**（真实页，ch4 钟 5s 最易触发）：t=0 孩子点错卡（locked=true，晃动窗 520ms）；t≈300ms 钟走完 → onFoeTimeout 同步段推进 step、旧答案卡未重绘，进入 820ms 演出窗；t=520ms 错分支续体执行 `cur !== run` 不成立（同一 cur）→ **`state.locked = false` 提前解锁**；t=520-1120ms 间孩子点击旧题面答案卡：uiPick 放行，`engPick` 对**新题**的 items 判定旧卡下标——碰巧命中新题 answerIdx 则白得 myScore+1（且随后与 onFoeTimeout 的 renderQuiz 双重渲染竞争），不命中则给一道从未展示的题记 miss、扣星。7-8 岁儿童在钟临近走完时点错（hesitation 到 ~4.9s 后点错卡）是高发现实场景，520/5000≈10% 的临期错答会落入此窗。

**影响**：分数/星级误记、600ms 陈旧 UI 可交互、双 renderQuiz 竞争；`MB.quiz.foeT` 观测亦紊乱。verify ⑤C 与 selftest #4 均未覆盖"钟在晃动窗内走完"路径（错点后静置，钟在窗外到期）。

**修复建议**：错分支续体加题身份守卫——`if (cur !== run || cur.quizzes[cur.step] !== q) return r;`（不解锁，交由 onFoeTimeout 续体收尾）；或引入 `foeTransition` 标志纳入 uiPick 门与两处续体。verify 补一条"错答后强制等钟走完、窗内连点断言 miss/step/locked"的竞态用例。

### M2 [numberdet] 确认键（主答案按钮）在吞输入期零反馈，违 §0.22 且背离家族先例

**证据**：`numberdet/_src/game-main.js`
- 251-252 行：`async function uiOK(demo) { if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;` —— 静默返回，无 sfx/无 nudge。
- 534-537 行：`okBtn.addEventListener('pointerdown', ... uiOK();)` —— 监听器也不补 pop。
- 对照同文件数字键 uiKey（222-224 行）被吞时有 `sfx('pop') + nudgeKey(d)`；对照家族 money 的提交主按钮（`batch13/money/_src/game-main.js` 526-530 行）：`if ((state.locked || state.demo) && !state.won) sfx('pop'); uiTapOK();`。

**影响**：big/small 反馈窗（700ms）、猜中演出窗（1050ms）、gone 窗（520ms）、教学 watch 期，孩子连点"确认"（主答案、最高频操作）完全静默——§0.22"吞输入期真实点击被吞时 sfx('pop')"硬条不满足；与同款数字键行为自相矛盾。

**修复建议**：uiOK 守卫分支补 `sfx('pop')` + okBtn nudge（CSS 已有 `#ok-btn.nudge` 动画可直接复用），或在 okBtn 监听器按 `state.locked||state.demo||state.won` 先 pop 再调 uiOK（照 money pay-btn 模式）。

### M3 [blocks] sceneSvg 包围盒未计入教学角标与 fill 虚线目标盒 → 两处关键视觉被 SVG 裁剪（同一根因）

**证据**：`blocks/_src/game-data.js`
- 包围盒（98-106 行）只枚举地面四角与**当前柱高**顶点，pad=10。
- 症状 A（底部裁剪·教学演示）：柱底角标（136-142 行）`y = (c+r)*uy + 2*uy + 15`，圆 r=14。3×2 count 网格 maxY=85（r2c1 南角），viewBox 底=95；**前右柱 (2,1)（教学点数序第 2 个）角标中心 y=100、文字 y=106.5，全部出界**——6 柱点数演示中该柱块数不可见，"角标相加=总数"的教学闭环缺一角（§0.6 教学质量）。
- 症状 B（顶部裁剪·fill 题普遍）：虚线目标盒顶菱形（119-133 行，`isoTopDiamond(r,c,gt)`，gt=2 时顶点 y=(c+r)*uy-3*uz）**高于所有当前柱的顶点**当且仅当缺该位置的满高柱。例：2×2 盒剩 [1,1;1,1]（holes=4，合法生成）：minY=-76、viewBox 顶=-86，而 (0,0) 目标菱形顶=-114（裁 28/34px）——目标盒顶部"补到这里"的虚线 apex 大半/整个不可见。holes=ri(2,6)，深缺损（holes≥4）概率约一半，ch2 全章及生成关均可命中。

**影响**：fill 题核心教学锚点（虚线目标盒）与教学演示角标两处关键信息被裁（§0.15 布局病害同族）。静态几何推演可复算（按 ISO={34,17,38} 精算），未浏览器取证。

**修复建议**：包围盒 grow 补两点——①fill 型按 `goal` 高度（而非 cols）计顶点；②角标区 `y + 2*uy + 15 + 14` 计入底界。verify ②a 几何审计补断言"goalbox 顶点/角标圆均在 viewBox 内"。

### M4 [blocks-verify] "首错不 pulse 正确卡"是空体 if —— 恒真断言（batch13 M2 同型）

**证据**：`blocks/_src/game-verify.js` 360-361 行：

```js
if (!optEl(q.answerIdx).classList.contains('breathe')) { /* 首错不 pulse 正确卡（miss=1） */ }
```

if 体只有注释，断言效果为零——若回归后首错即 breathe（§0.7 违反），verify 仍 PASS。产品现行行为本身正确（`game-main.js` 165 行 `if (q.miss >= 2)` 才 pulse），故本条是**验证盲区**而非行为缺陷；但 §0.27/M2 教训明令禁止这种"装样子"断言。

**修复建议**：改为参与判定，如 `wrongOk = ... && !optEl(q.answerIdx).classList.contains('breathe')`。

---

## minor 问题（可继续，须记录）

### m1 [multibattle] 对手钟进度条（.fc-bar）点击被静默排除，无轻反馈
`multibattle/_src/game-main.js` 426 行：钟条排除分支无兜底 pop。§0.16。修复：补 `sfx('pop')`。

### m2 [multibattle] "再来一局"路径推迟写档：输局首局的通关与星星在重赛完成前不落盘
273-277 行 replay 分支不调用 `KIDS.level.pass`。中途退出则丢档。修复：进 again 层前先 pass 保底（core 保星 max 语义下重赛更高星可覆盖）。

### m3 [numberdet] demoPlan 补步分支可产生"已排除数"演示步（潜伏，当前不触发）
418-430 行：`s=N` 时 plan=[N-2, N-3, N]，第二步 `N-3 < lo(=N-1)` → 'gone'。当前 flat0 secret=12 永不触发；属潜伏缺陷。修复：补步改 `s===N ? N-1`。

### m4 [blocks] count 域审计下界 4 与 SPEC 定稿 6-12 不一致（口径松）
`game-core.js` 244 行 `q.ans < 4`、`game-verify.js` 98 行 `t >= 4`、genCount 注释仍写 4-12。生成器 h≥1 恒 ≥6 当前无实害；统一改 6。

### m5 [numberdet] 题面定稿文案语义残缺："神秘数藏在 二十 之间"
缺"1 到"，整句不成话。**SPEC §3 定稿本身的缺陷**（agent 照抄无责）；须 manifest/文案层修（num_q1='神秘数藏在 1 到'），clip/TTS 兜底/tip 三处联动。

### m6 [multibattle] ch4"章内混合"两读，实现取"跨章混合复习"未留裁定记录
ch4 = 2 题 {8,9} 域 + 3 题全域混合复习（承 times 先例）。实现自洽，需产品裁定固化到 SPEC 防返工。

---

## 已核查通过项（实际检查过且无问题）

- **§0.1-§0.5**：三款 build.py 离线断言/`</script>` 检查/core 版本锚齐全；verify stub 五 API 全覆盖、winFlow `if (VERIFY) return` 齐；mulberry32 确定性+双生成 JSON 断言齐；静态 20 关循环章+生成关随机 dch；章号 1 基/keyOf/nextHint 预告语义/GEN 无"明天："前缀/启动 dayEnd 传 lim-1 全正确；sayP/sayR/sayW 三态与 `===2` force 豁免实现与 verify/复验双重实证一致。
- **§0.6/§0.26/§0.27**：三款教学看-帮-独链完整；吞输入守卫均 `(state.locked && !demo)` 族（M1 教训已落实）；错分支 locked-before-await+身份守卫三款齐；`__bkDemoR/__mbDemoR/__ndDemoR` 均真实返回值（M2 教训落实）。
- **§0.7/§0.7a/§0.21**：救援钟口径三款各自正确；multibattle 两钟独立有 selftest 实证；numberdet 键入/删除/gone/empty 不重置、合法猜测与读题重置（复验 N5/N7 实证）；救援视觉在场。
- **§0.9/§0.11/§0.15**：双 viewport 三重过闸；量测等入场动画；blocks 等轴测共享顶点/画序（depth=r+c 单调）/三面互异有像素级 path 复算审计。
- **§0.14/§0.17/§0.23-§0.25**：5 题/星级三口径与 SPEC 一致（numberdet 星级公式+DP 最坏步数复算扎实）；干扰池三款近邻互异禁 0 负，multibattle 干扰池恰覆盖口诀串行错型与加法混淆；题面 clip 化与自建数词副本双保险。
- **§0.20**：底栏三件门+主路径身份守卫三款齐。
- **SPEC 各款数值域**：blocks 四题型域/热身/互异/投影独立复算、multibattle 章域+互异+ch4 形态、numberdet N/base 表值双证+恒中点二分 ≤base 三层验证——均核过。
- **multibattle 对手机制主干**：钟代际（foeGen）防串扰闭环；抢答先于超时/超时先于抢答两序均安全（唯 M1 错窗例外）；教学 watch 期钟冻结双证；超时零惩罚双证。
- **numberdet 键盘边界**：前导 0 归并、两位封顶、已排除/范围外不计次、空确认 empty 不计次——引擎与 UI 双层验证齐。
- **家族一致性**：与 batch13/money 逐段同构；hear/replay 在 locked 期静默返回为家族一致行为（非本批回归）。
- **verify 质量**：三款 game-verify 总体是真审计（独立复算分源、DP 复算、几何 path 解析复算），复验脚本断言有判别力；除 M4 一处空体外未发现其他恒真断言。

## 未覆盖部分与残余风险

1. **未浏览器取证**：M1 竞态与 M3 裁剪为静态推演（坐标与时序可精确复算）；修复后建议各补定向复现用例。
2. **core.js（KIDS 核心）未审**（交付边界禁区）。
3. **语音实物未验**（verify_voice/主会话域）。
4. **blocks `_selftest.py` 无运行产物**（`_shots/` 不存在，multibattle/numberdet 的在场）——关键路径已被 verify_one_blocks B7/B8 覆盖，风险低但应补跑留痕。
5. **WCAG 对比度未数值复算**；`batch14/index.html`（hub）与 `verify_entry.py` 未审。
6. **产品性观察（不计缺陷）**：multibattle 全程不答题=3★+鼓励层（miss/速度分离口径极端推论，SPEC 明示）；ch4 对手钟 5s 对未熟练二年级儿童偏紧——建议产品侧评估放宽至 6-7s 或自适应（SPEC 定值，非实现错误）。

## 置信度：高
