# batch24 反方审查报告归档（2026-09-09，源自审查代理 result）

审查方式：三款六件源码逐文件精读 + SPEC-BATCH24 §0.55-57/§1-3 与家族 §0（含契约 A-F）逐条对照 + 独立 headless 实测（playwright 独立 `p.chromium.launch()`；hook `KIDS.voice._stop/_mk` 记录每次语音调用与被掐时 `currentTime/duration`，autoplay 放行让 clip 真实走时）。

## Major（2 项，修复轮已修——见文末修复记录）

**M1. trace 数词朗读（tra_n_）大面积被掐——SPEC §0.56「全部锚点连完=…+数词朗读」真值条款实际失效（b22 slide / b23 share 截断雷家族第三型复发）**

证据（headless 实测 KILL 链，clip 实长 tra_right=2280ms、tra_n≈1150ms）：
- **flat<3 每题**：done 分支 `queue([tra_right, tra_n_<num>])` 后仅 `await wait(700)`→`nextQuiz()` 末尾 `sayP(VOICE.hint)`→`voice.play` 内 `_stop()`。实测 `play(tra_hint)` KILL `tra_right+tra_n_3` **at=648/2280（28%）**——且 queue 靠 `onended→_qtimer` 接力，`_stop` 清 `_qtimer`+pause 使 onended 永不触发，**tra_n_<num> 一次都不播**。
- **每章末关的末题（flat 4/9/14/19 及生成关章末）**：won 分支 queue 后无 wait 直接 `winFlow()`→celebrate→chapterEnd/dayEnd 播 core 语音→`_stop`。实测末题数词只播 **87ms（7%）**。
- **教学演示**：queue 后 `say('写得真像')` KILL 链 **at=1095/2280（48%）**，数词不播。
影响：数词朗读（本款核心数感教学内容）在语音教学期三关、每章末关末题、首次教学演示三类场景全部实际丢失。verify ⑮ 数词对拍 stub 了 queue 本体，只测「调用参数正确」不测「播放完成」——断言与听觉效果脱节，此雷穿透全绿门禁。

**M2. dressup flat<3（含教学演示）每题贴齐的 dru_right 只播 ~21% 被题面句掐——b23 share M2 同型第三次复发**

证据（实测 dru_right 实长 2664ms）：
- 真实贴齐一题：`play(dru_right)` 后 634ms `say(题面句)`（renderQuiz→speakQuiz）→ **KILL at=571/2664（21%）**（:353-359 `await wait(620)` 即 renderQuiz）。
- 教学演示收尾：`say('装扮好啦')` KILL **at=983/2664（37%）**，且收束语与 dru_right 文案「装扮好啦，真好看」撞头。
影响：前 3 关每题正反馈主体丢失 79%。

## Minor（3 项）

**m1.** shaperoof 错反馈 shr_wrong 尾部被题面句掐 277ms（12%）：错→（1000ms 窗）→对→演出 1050ms→`play(shr_q)` KILL at=2003/2280。
**m2.** dressup rescueAns 演出期（demoPlace ~2.6s）真实输入通道开放（竞态窗）：全程未置 `state.demo`，pointGhost 等待段用户真实点贴纸可改 `q.sel`——与教学路径（tutorialWatch 有 `state.demo=true` 全程门）不对称。
**m3.** shaperoof `sayP` 死代码（定义后全文件未调用）——顺手清理级。

## 逐方向「已查无」清单（摘要）

GEN_HINTS/hint 章末语义：三款全对（生成关 dch 随机预告与下一关实际章型可能不符=b23 weather 既有近似，非本批引入）；家族 A dayEnd：启动处三款全对，winFlow trace 传 null=b23 weather/piano 定版同款合规；shaperoof 近形对：封闭三对逐项一致+ch3 目标∈6 近形成员+干扰伙伴在场+近形视觉可辨（圆角 vs 四尖/平底直径线/截头平底）；trace 多笔分笔实测生效（600ms 短顿延迟 377ms 出现+判定不锁）、8/9 笔顺符合标准、闭合环弧长采样实证、数词取数无 bug（播完性被 M1 破坏）、错点防重入 200+800、锚点 64×64；dressup 状态机 need 全贴才过+贴错弹回不清 placed+两击制选中视觉+again 零罚+free/task 切换与 piano 逐行同构（设计内）+主题物品无歧义（19 片对账全对）；救援双锚：shaperoof 实测方向级 pulse@13.6s/答案级 breathe@29.6s——**方向级不重置 lastAct、答案级准时可达**，trace/dressup 与 piano 逐行同构；演出窗吞击 bump ✓；clip 文案同源 27/27；星级永不 0 星；预置档 v1.0 ✓；free 零写档+19 片双 viewport 无裁切；单文件离线；教学演示实证三款 'right' 4.4/5.4/9.6s ≤16s；两级入口就位。

## 观察项（不列问题）

通关 celebrate 掐通关语音尾 44-164ms（家族共用件既有）；SPEC 笔误清单（贴纸池 18→19、§4 条数 29→27、trace 同关互异→相邻互异、dressup 教学「贴一件」→贴齐一题）；dressup verify 头注释「并集 16」笔误；trace build.py 缺钩子/家族 A 硬检（门禁强度不一，行为已正确）。

## 总结论：需修后收 → **修复轮（2026-09-09）已落地 8/8**：

1. trace done 窗 700→4100（tra_right 2280+150+tra_n≈1150+余量）；2. trace won 链后补 wait 4100 再 winFlow；3. trace 删演示收束语 say('写得真像')（撞头互掐）；4. dressup 判对窗 620→3200（dru_right 2664+余量）；5. dressup 删演示收束语 say('装扮好啦')（文案撞头）；6. shaperoof 亮卡 620→900（错→对→读题间隔 2330>2280 防尾截）；7. dressup rescueAns 置 `state.demo=true` 演出门（:276/:297 双入口已有 `(state.demo && !demo)` 检查，置标志即生效）；8. shaperoof sayP 死代码删。

验证：三款 rebuild+门禁 3/3×3（selftest 不破坏）+定向实证 6/6（E1 关内链零掐/E2 flat4 won 链零掐（5 题×2 段全播发）/E3 教学无掐/E4 dru_right 播完/E5 无撞头/E6 shr_wrong 零尾截/E7 演出门双入口+miss 不变）+全量回归 6/6。verify 侧补 clip 时长断言取舍：不改 agent verify 结构（风险>收益），以定向实证（hook _stop 实测 KILL 链）替代且强于 stub 断言。

复验方法：headless hook `KIDS.voice._stop/_mk` 记录 KILL 时 `currentTime/duration`（clip key 经 clips 表 uri 尾 60 字符反查），autoplay 放行，按 M1/M2 场景跑真实页对拍。
