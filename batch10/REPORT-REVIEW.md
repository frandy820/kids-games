# batch10 反方审查报告（core-adversarial-reviewer，2026-09-07）

> 审查对象：SPEC-BATCH10.md / 三款 _src 全部 6 类文件 / 产物 index.html×3 / 共享 core（design/core.js）/ 外部验证脚本 4 个。只读静态审查。
> 结论：**fatal 0 / major 1 / minor 7 → revise**。三款整体工程质量高（sayW 灰化/不灰化口径严格匹配、§0.21/§0.22 新门禁实现齐备）；必修 M1 后放行。

## major（必修）

### M1 chainsum：numCn(0) 返回空串，cur=0 的题面语音缺当前数词
- **证据链**：game-data.js:45-51 `D=['',...]` 故 numCn(0)===''；:55 qSpeech 拼出'加二等于几呀'（缺"零"）；game-core.js:48 answer=c-d 可为 0、:75 链推进 c=q.answer 使下一题 cur=0、:123-125 structWhy 放行 cur>=0；game-verify.js:287-300 numCn 对账从 i=1 起、qSpeech 四型无 cur=0 型——**verify 拦不住（验证盲区佐证）**。
- **影响**：ch1/ch2 与生成关下 answer=0 的非末题必然使下一题 cur=0，孩子听到不完整题面（视觉车厢/运算牌完整，可玩性未损，违 §0.19 题面全语音承载）；renderChip aria-label 同源缺失。
- **修复**（已落地）：D[0]='零'（仅 qSpeech 消费无副作用）+ verify 补 numCn(0)='零' 臂与 qSpeech cur=0 型断言 + rebuild + 重跑全链。

## minor（处置）

| # | 问题 | 处置 |
|---|---|---|
| m1 | simon verify stub 缺 KIDS.voice.say（§0.2 字面清单） | 已补 stub（当前无调用，防未来漏拦） |
| m2 | simon locked 演出窗（敲对庆祝 950ms）点击无轻反馈，与另两款不一致 | uiPad locked 门补 sfx('pop')（won/demo 态静默） |
| m3 | §0.22 pop 轻反馈仅 simon 有断言，chainsum/habit 外部验证盲区 | 两外部脚本教学期乱点补 S:pop 计数断言（HOOK 已包 audio.sfx） |
| m4 | simon sayW 第三错（豁免恰一次 ===2 另一臂）无断言 | S10c 补第三错静默臂（miss=3 后 wrongv 仍 2） |
| m5 | simon 救援"pos 保留"设计决策零断言（与错键清 pos 共用函数，回归传错参全绿） | S11 补 pos 保留断言（敲对 1 键→救援重播→回 input pos 仍=1） |
| m6 | C16 注释称 flat5/flat12 实现只查 flat5 | 注释已改（全量恒等由页面 verify 40 关 structWhy 覆盖） |
| m7 | 兔子按钮语音 sayP 无 10s 节流，偏离 §0.16 字面（三款一致承前批形态，hop 动画为视觉轻反馈，空白点击路径已合规） | 记录在案——系列级统一处理（batch3-10 同形态，单独改 batch10 反引入不一致） |

## 已核对项清单（摘要）

- **§0 22 条逐项**：单文件离线（三重断言+data:audio）；verify 自检（winFlow 早退）；mulberry32 确定性；keyOf/dch/GEN_HINTS/dayEnd；**sayW 灰化匹配**（chainsum 灰化款 >=2 / simon+habit 不灰化款 ===2 与 SPEC 逐一相符）；教学看帮独+顺序链（三形态均 §0.6 允许）；答错零惩罚+救援钟（lastAct 只被正确推进更新，错点不重置双臂三款齐）；钩子拷贝（无 batch9 m2 型死字段）；双 viewport+触摸≥96/64+overflowX；家长门两位数；音效合成+TTS 兜底；每关 5 题星级永不为 0；干扰项禁 0 禁负互异；manifest 16 条零手抄；底栏守卫+身份守卫三款齐；**§0.21 救援视觉重现三款齐**（chainsum breathe/simon 序列重播/habit pulse）；**§0.22 轻反馈三款齐**（缺口 m2 已修）。
- **chainsum 专项**：answer=cur±d 恒等/干扰 |v-a|∈{1,2,d}/参数域四章/SPEC 逐项；禁三连+每关±各≥1+ch4 切换≥3（换向兜底与三连禁冲突在当前参数域数学不可达——四章逐一验算）；**§0.17"禁 0"裁决（干扰 ≥1、答案可 0）确认合理自洽**（structWhy 分层实现正确），代价是 cur=0 题面暴露 M1；同关五题链式递进 chainWhy+真实点击对账。
- **simon 专项**：序列长 2/3/4/2-4+速度 500/380/生成关三档与 SPEC 一致；禁三连双保险；错键重播 pos 清零+miss 计数；救援重播保留 pos（断言缺口 m5 已补）；教学时序锚点正确（解锁→uiPad 演示链同步无 await 窗口）；开场链 verify flat5 绕开 freshTut 分支——脚本与实现一致。
- **habit 专项**：HABITS 6 流程 27 步与 SPEC 逐字一致（REF 独立字面量二次对账）；乱序≠原序恒等重洗；章 1-3 两流程池/章 4+生成关全库；.gone 语义严格区分（已排卡 vs 点错卡）；点对飞入 transition 后量测；题面 queue 尾段 {key:null} TTS 兜底用法正确。
- **验证体系**：页面 verify 三款齐 batch9 定版口径（40 关审计+sayW 三态+clipOk+开场链+双 viewport+冒烟）；外部断言非 vacuous（通关=存档 stars+等 5.2s）；产物与 _src 关键行抽查一致；verify_batch10 永不吞错。

## 残余风险（审查方声明）

只读未运行脚本（M1 修复后须重建重跑全链）；clip 音频时长未实测（simon 换题 LEAD=1200ms 若 si_hint 超 1.2s 有约 0.3s 叠音可能——待实测观察）；chapterEnd 弹层 3.4s 自动 proceed 但弹层不自动关（core/前批沿用形态）；入口页仅经 verify_entry 间接确认。

## 置信度

高（M1 可达性经引擎数据流逐步推演+行级证据+verify 盲区佐证；minor 均附文件:行号）。
