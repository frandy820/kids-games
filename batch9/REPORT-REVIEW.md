# batch9 反方审查报告（core-adversarial-reviewer，2026-09-07）

> 审查对象：SPEC-BATCH9.md / 三款 _src 全部 6 类文件 / 产物 index.html×3 / 共享 core（design/core.js）/ 四个验收脚本 / voice manifest。只读审查。
> 结论：**fatal 0 / major 1 / minor 6**。游戏本体与 SPEC 契约高度一致，唯一 major 在验收脚本层。修 major 后放行。

## major（必修）

### M1. mirror/memgrid「语音注入对账」断言 vacuous——clips 注入失败将穿透全部防线
- **证据**：verify_one_mir_mem.py M12/G12 原判据 `missing=[k for k in keys if src.count(k)==0]`——key 名（mir_hint 等）在 game-data.js VOICE 表与 core.js 里本来就出现，clips 注入块整块缺失时 missing 仍恒空、断言恒过。对比 whereistand 版有真判据 `n_audio>=10`，mirror/memgrid 无。build.py:17-22 注入包在 `except: clips=''` 里静默降级；mirror/memgrid 的 game-verify.js 无任何 clip 注入断言（verify 页 stub 了 voice.play）。
- **影响**：注入链路故障时两款会以"页面 verify PASS+外部复验 PASS"姿态交付无内嵌音频产物（运行时降级系统 TTS，童声全失，违 §0.1 且无人发现）。**当前产物实测无此问题**（逐款计数 wis 10/mirror 8/memgrid 7 条 data:audio，与 manifest 一致）——属验收网缺口而非现行缺陷。
- **修复**（已落地）：① verify_one_mir_mem.py M12/G12 主判据改 `n_audio=src.count('data:audio/mpeg;base64') >= len(keys)`；② 三款 build.py 注入失败改 `sys.exit(3)` 非零退出+clips 空串断言（禁静默降级）；③ mirror/memgrid game-verify.js 补 clipOk 单元（随 m1/m2 批次 _src 改动统一 rebuild）。
- **实证**：增强后复验 35/35——M12 audio=8 keys=8、G12 audio=7 keys=7。

## minor（处置）

| # | 问题 | 处置 |
|---|---|---|
| m1 | whereistand game-verify.js 无 sayW 单元（外部 verify_one_wis 有兜底） | 补页面级三态单元对齐另两款（待 _src 批次） |
| m2 | wis/mirror 钩子 answered/solved 死字段（quiz getter 恒新题恒 false），下游 verify 断言 vacuous | 删死字段+删 vacuous 断言（待 _src 批次） |
| m3 | 猴子无尾与 SPEC §1 字面偏差（实现为猴脸圆耳呆毛，8 只可辨别性目标不变） | SPEC §1 已对齐标注（审查 m3） |
| m4 | mirror/memgrid 救援缺"错点不重置"外部用例 | 已补 M11b/G11b（静置 12s→错点→再 10s，总 22s 处救援已触发=错点不重置实锤）→ 35/35 PASS |
| m5 | memgrid 救援 14s 全量重闪对 k=4 相当完整复现答案，支架梯度偏陡（README 已声明视觉题面视觉救援变体） | 记录在案，观察试玩数据后决定是否调整 |
| m6 | mirror/memgrid 教学临时解锁依赖 uiPick 内部同步时序（正确但脆弱，未来插入 await 即破） | 加注释锚点（待 _src 批次） |

## 已核查通过项（摘要）

- **单文件离线**：http:// 仅 SVG xmlns；每文件恰 3 处真实 `</script>` 闭合；clips data:audio 内嵌 10/8/7 条与 manifest 对账一致。
- **答错零惩罚**：三款首错不 pulse（pulse 门 miss>=2）；mirror 灰化卡 pointer-events:none+引擎 again 防御。
- **sayW 豁免定版**：wis `q._miss===2` / memgrid `q.miss===2`（不灰化款恰一次）/ mirror `q._miss>=2`（灰化款 miss 封顶 2 等价一次）——三款口径与 SPEC §0.5 修正版一致。
- **quiet 顺序链**：三款开场 queue([hint,题面])、教学交接 queue([turn,题面])，无 play 切断 queue 路径。
- **教学吞输入**：wis locked 恒 true+demo 通道；mirror/memgrid 见 m6（成立）。
- **日历限额+写档时机**：DAILY_NEW=6/DAY_CAP=2+加关；写档均 celebrate 后。
- **章节数据**：keyOf 一致、mulberry32 确定性、40 关全量 structOk。
- **mirror 镜像数学**：竖轴 c↔N-1-c/横轴 r↔N-1-r，src/dst 限侧；**原形干扰机制成立**（dch2+ 候选含同 mid 同 color 仅 mirrored 不同的原形，structOk 强断言）；渲染零手抄。
- **whereistand 序数**：up/left→k-1、down/right→5-k 与 DOM 渲染顺序三方一致；"从右边数"反转正确；文案无"它的"；ordinalCn 与 SPEC 例句逐字一致。
- **memgrid 两态**：show 期 engTap 返回 'show' 吞输入；救援重闪不触碰 picked；同格重复点错不累计。
- **家长门 E2E**：两位数加法+加关 limit 6→11 断言过。
- **产物一致性**：三款 index.html 关键函数/注释与 _src 逐点匹配。

## 残余风险（审查方声明）

未实际运行脚本（只读；结果取自脚本自述）；verify_voice.py 未读（mp3 size 门禁强度与 M1 合并考虑）；真实听觉/镜像可辨性依赖试玩；iOS Safari autoplay 未真机验证；_src↔产物字节级 diff 抽样核对（流程防漂移）。
