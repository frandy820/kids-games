# batch23 反方审查报告归档（2026-09-09，源自审查代理 result）

审查方式：六件源码逐文件精读 + SPEC-BATCH23 §0.52-54/§1-3 与家族 §0(1-48) 对照 + 独立 headless 实测（clip 时长量化、verify 页 pageerror）。

## Major（3 项，需修后收）

**M1. 启动 dayEnd 的 nextHint 传 `lim`，违反家族 §0.4 明文「传 lim-1」——三款系统性右移**
- 证据：`weather/_src/game-main.js:433`、`share/_src/game-main.js:543`、`piano/_src/game-main.js:481` 均为 `KIDS.ui.dayEnd({ nextHint: nextHint(lim) })`；SPEC-BATCH15 §0.4 定版「启动 dayEnd 的 nextHint 传 lim-1」。铁证：share 同文件 `:350` 的 winFlow 路径正确写了 `nextHint(lim - 1)` 并注释「§0.4 防跳章」——作者明知规则，启动路径漏改。
- 影响：lim 为 5 的倍数时（lim=10/15/20 真实可达）预告跳章。b21/b22「hint 右移」家族雷在第三处调用点复发；现有 verify 均未覆盖启动 dayEnd 路径。
- 修复：三处改 `nextHint(lim - 1)`；verify 补启动路径断言。

**M2. share 判对奖励语音每题必被截断（b22 slide 同型雷复发）**
- 证据：`share/_src/game-main.js:269-271` `sayR(VOICE.right)` 后仅 `await wait(1600 * SPEED)` 就 `renderQuiz(true)`→题面 TTS→`_stop()`。实测 sha_right clip=**2880ms**，1600ms 窗只播 55%。
- 影响：关内每答对一题「每只一样多，真公平」都被掐断——正反馈主体丢失。
- 修复：窗改 ≥3000ms（实测 clip 长 +300ms 余量）。
- 对照：weather wea_right 2808ms（尾部 ~190ms 轻截）、piano pia_right 2544ms（flat<3 且 2 音序列尾部 94ms 轻截）——两款尾音级，列 minor 校准。

**M3. weather 风天错配文案对保暖类干扰是反常识错误陈述**
- 证据：`weather/_src/game-data.js:26` `wind.w='起风了，穿这个不暖和'`；wind 单件题干扰=其他 3 季各 1 件（必含 1 件 snow 衣物）。孩子点「厚外套」听到「穿这个不暖和」——与上一章「厚外套=雪天保暖」直接矛盾（§0.43「星期八」条款同精神）。
- 修复：wind 文案改为不否定干扰物属性的表述（如「刮风啦，穿件小外套正合适」），同步重合成 clip+verify ② 对拍+SPEC 口径写死（4 天气×1 条通用文案）。

## Minor（4 项）

**m1.** piano 错音防重入窗 720ms（200+520）< 家族定案 1000ms——乱弹连击下 miss 记数偏快。修复：wrong 分支补至 1000ms。
**m2.** weather wea_hint 实测 2040ms vs qTimer 2000ms——尾音 40ms 截断。修复：接力窗 2200ms。
**m3.** piano 弹对 busy 窗 340ms 内连弹第二键被吞——快弹正确序列偶发「弹对被吞」。建议 right 路径缩短至 200ms。
**m4.** piano 救援为一次制（动作才清零），weather/share 为持续重发制——完全不动时 14s+30s 后无后续（有重听钮兜底）。SPEC 未禁止，登记保留。

## 重点方向逐项结论（摘要）

GEN_HINTS[k]↔dch=k+1：已查无（三款映射正确+C7 断言在场）；章末 hint[i]↔CHAPTERS[i+1]：已查无；教学演示泄漏 wrong 音：已查无；weather 错配键映射：已查无（但文案本体 M3）；两件题 hold 清理：已查无；干扰卡=另一天气 need 物：不算错（设计内对比教学+union 防语义对判错）；share 两击制边界/takeBack 越界/rem ready 提前/死锁（[3,2] tray0 取回通道可达+两级救援）：已查无；数词「两」：已查无；piano listen→play 旁路/free→follow 复位/弹错相位/AudioContext unlock：已查无；存档 v1.0：三款一致（预置档开局场景留试玩补测）；救援钟 14s/30s：三款一致（piano 一次制差异 m4）；try-catch 吞错：已查无（verify 页 pageerror=0 复测）。

## 其他观察

- SPEC §1「4 天气 × 2-3 错配文案」与语音行「3-4 条」内部矛盾——实现取 4 条通用（每天气 1 条）满足语音行，修 M3 时口径写死。
- 流程待办：主入口 66→69 卡未做——非缺陷（收官位）；batch23/index.html 三卡已就位。（注：主流程已随后完成 69 卡插卡+回归 entries PASS）

## 总结论：需修后收

3 major 均小改动（三处传参、一处等待窗、一条文案+clip 重合成+verify 同步），无架构性问题；share 判定/状态机/verify 分源质量很高，weather 封闭表与 piano 相位机设计扎实。修完 M1-M3（建议连带 m1/m2）+补启动路径与 clip 时长 verify 断言后可进入试玩收官。
