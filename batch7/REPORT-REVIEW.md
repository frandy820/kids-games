# batch7 三款独立反方审查报告（fishcolor / fruitsplit / hopscotch）

> 来源：core-adversarial-reviewer（2026-09-07）。审查者只读无执行，全文为静态审查结论（行级证据），由 orchestrator 代落盘。
> 修复记录见文末「修复处置」节。

## 审查结论

**fatal 0 / major 1（三款同族各计 1 处）/ minor 7。总体：修复后放行。**

无教错内容（颜色词-色值 9 色逐核、等分两半数学严格等大、数序 1-10 四章区间规则无误、数字/圆点/报数三源一致）；无确定性泄漏；无钩子活引用；无 keyOf 软锁；章末预告语义正确；末题演出窗主答路径有身份守卫。1 处底栏按钮绕教学门（三款同族）+ 7 项 minor。

## major

### M1 教学期底栏「重玩」按钮绕过吞输入门禁（三款同族）
- 证据：三款 replayBtn handler 仅 `if (VERIFY || !cur) return;`（fishcolor L332 / fruitsplit L360 / hopscotch L312），无 locked/demo/won 门；对照三款 hearBtn 均带 locked 门——唯独 replayBtn 漏拦。
- 失效机理：教学期 `state={demo:true,locked:true}` 点重玩 → startLevel 重建 cur 并整体重置 state → 挂起的 tutorialWatch 续体经 demo 通道作用于新关真实状态（计钓起/计对错）；fruitsplit 变体（tutSeen 落盘前重玩）会 freshTut 再判 → **双 tutorialWatch 并发**（双份语音/幽灵手指/演示）。
- 为什么复验没拦到：三款 verify 吞输入单元是直接操纵 state 模拟，未走「真实 tutorialWatch + 真实按钮」路径。
- 修复：replayBtn 补 `state.locked || state.demo || state.won` 门；rabbitBtn 顺手补 `state.locked || state.demo` 门（教学期点兔子不打断教学语音）。

## minor（修 m1/m2/m3/m5/m7；m4/m6 记录在案）

1. m1 三款教学开场/交接用 sayP 而非 sayR（SPEC §0.5 契约偏差；当前 flat0 等价无实害，教学后移会静默哑音）→ **已修**（6 处 sayR）
2. m2 fishcolor「黑色」#5A5450 实为灰棕（9 色中唯一词色偏差）→ **已修**（加深 #3A3633/#262320）
3. m3 fishcolor verify 注释宣称「干扰色不含目标色」但代码无该断言 → **已修**（structOk 补目标色鱼数 ≥ need 显式断言+注释对齐）
4. m4 fruitsplit apple 梗叶/melon 藤偏右，切后两半装饰不对称（面积等大无错，装饰不等与等分语义轻微张力）→ 记录，视试玩反馈
5. m5 fruitsplit/hopscotch 20s 救援只播固定 hint 不重读题面（不识字孩子得到催促句而非任务内容，弱于 fishcolor 惯例）→ **已修**（改 KIDS.speak(qSpeech(q)) 重读题面）
6. m6 fruitsplit 拼合章同色干扰对（apple/berry 同红、melon/wedge 同绿）——拼合训练点本就是形状轮廓，知情保留
7. m7 fruitsplit uiTapOption 无 demo 通道豁免（靠「先解锁再同步调用」变通兜住，三款间不一致+脆弱）→ **已修**（对齐 uiCut 的 `(state.locked && !demo)`+删变通解锁）

## 已核查通过项（审查者逐项核对）

- 颜色词-色值映射 9 色逐核（8/9 准，black 见 m2）；近似对 NEAR 色系关系正确；章4 色池全带近似对
- 等分两半=同 art+同 clip+镜像 transform，数学严格等大；verify sameArt/mirrorTr/clipEq/sizeEq 与构造同源
- 数序四章区间规则、S 形两行 gridArea 映射、倒数蓝旗+题面前缀、numCn 数词表全对
- buildPath 数字+圆点双显，dotsHtml 恒产 n 个；报数与格号一致
- 章末预告 nextHint 语义正确（打完 ci+1 章预告 ci+2 章）；GEN 无「明天：」双写
- 末题演出窗主答路径 `const run=cur` 身份守卫三款齐全（replayBtn 入口即 M1，已修）
- keyOf 1 基、进度章/难度章解耦无 math M1 型软锁
- mulberry32 派生种子；无 Math.random 直用于内容生成（core 内音效噪声/家长门乱序合法）
- verify 与真实路径同源（真实 startLevel/钩子函数；winFlow VERIFY 早退；发声全 stub）
- 钩子 getter 全拷贝（slice/map/字面量）
- sayW 三款节流实测断言在 verify 内（flat0 两错 2 条/flat3 两错 1 条）
- demo 形参无外部绕锁面（window 钩子不传 demo）
- 首错不 pulse/again 早退不计数
- 产物结构：3 对 script、无字面 `</script>`、唯一 http=SVG xmlns、core 段 412 行三款一致、clips 六键齐、_src 与产物抽查同步
- 触摸目标：.swim 内层动画+按钮盒静止≥64 实时双断言；hopscotch .cell≥64；fruitsplit 卡 150×170/刀钮 132
- 零文字依赖：题面全语音+色卡/旗帜/圆点自解释，文字均装饰冗余

## 残余风险（审查者声明）

静态审查未运行代码（M1 机理为数据流推断，修复实证由 orchestrator 补齐）；语音链 manifest 对账未独立核（外部脚本域）；fruitsplit/hopscotch build.py 仅结构抽查；外部验收脚本与截图未审；视觉对比度未做 WCAG 数值计算；动画/文案适龄含经验判断（以试玩实测为准）。曾三度接近误报（hopscotch sub 恒文案/fishcolor script 计数/core _save 活引用）均经原文复查排除。

---

## 修复处置（orchestrator，2026-09-07）

- **M1**：三款 replayBtn 补 `locked||demo||won` 门 + rabbitBtn 补 `locked||demo` 门
- m1：三款教学 watch/turn 6 处 sayP→sayR
- m2：black #5A5450→#3A3633（fin→#262320）
- m3：structOk 补「目标色鱼数 ≥ need」显式断言（防生成改动后目标鱼不足卡关；干扰取非目标色由构造保证，注释对齐）
- m5：fruitsplit/hopscotch 救援改 `KIDS.speak(qSpeech(q))` 重读题面
- m7：fruitsplit uiTapOption 门对齐 `(state.locked && !demo)` + tutorialWatch 删变通解锁两行
- m4/m6 记录在案（装饰对称视试玩反馈；同色干扰知情保留=形状训练点）
- 复验：verify_review_fix.py **13/13 PASS**（M1 三款教学窗真实点重玩=教学照常完成 tut=watch→help/tutSeen 落盘/0 错误；演出窗点重玩被拦 winFlow 正常写档；m5 救援 TTS=题面内容「把水果切成两半」「跳到…」）+ **verify_batch7.py 复归 5/5 PASS**（三款 rebuild：fishcolor 266973/fruitsplit 259811/hopscotch 247075 B）
