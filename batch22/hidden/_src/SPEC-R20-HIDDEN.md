# SPEC-R20-HIDDEN · 隐藏朋友难度加深增补（r20，2026-09-20）

依据：AUDIT-56 行19 黄款判定「视觉搜索遮蔽目标，搜索训练跨龄但仅 2-4 目标=认知负荷不足」实测 31.6s/关；
行94 建议方向「目标 5-6 只+同色系干扰、找完答总数（不显计数器）、限定顺序找」。
校准：b22 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）。本文件为 SPEC-BATCH22 §1 的 r20 修订版，
与其冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「视觉搜索遮蔽目标」玩法骨架与教学链（flat0 watch→帮→独不变），消除「纯知觉搜索」：
三个新认知维度分章爬升——**计数作答**（点数报数+基数概念，幼小衔接数学核心）、
**同系干扰**（视觉判别：须辨局部特征而非颜色扫除）、**记忆闪现**（工作记忆+搜索复合）。
审计建议「限定顺序找」不采纳：指令顺序记忆与计数作答叠加对 5-6 岁超载（维度 >2 同题），
且语音表达复杂（顺序句长），SPEC-BATCH22 §1「题面报数」结构保持前提下弃用。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键 'ch-lv' 全不动）

| 难度章 | 型 | 目标 n | 遮蔽率 | 干扰动物 | 计数作答 | 闪现 | 新认知维度 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 藏猫猫（教学） | 1 单种 | [2,3] | [0.30,0.45] | 异种 1 只全可见 | 否 | 否 | 基线（原样保留，教学骨架不动） |
| 2 数一数 | 2 单种 | [4,5] | [0.40,0.55] | **同系 1 只半遮蔽 [0.35,0.55]** | **是** | 否 | 目标数上探+视觉判别+点数报数 |
| 3 找两种 | 3 双种（各 ≥1） | [4,5] | [0.35,0.60] | 无 | **是** | 否 | 题面报数 X+Y 合成+总数作答 |
| 4 记住它 | 4 混合掷子型 ∈{2,3} | 子型域 | 子型域 | 子型域 | 是 | **是** | 工作记忆（闪现）+全维复合 |

- 型 4 每题掷子型 ∈{2,3}（型 1 教学型不进混合），全同向时翻 qi1 保证全关 ≥2 种子型（承原混合真值）。
- 位池 SLOTS=6、互距 ≥256、HIT_R=78 全不动：n≤5+干扰 1=最多 6 位，位池天然容纳。
- 遮蔽率全局界 [0.30,0.60] 不变；章内子区间按上表（型 3 上探到 0.60 顶）。
- 同系对（ANIMALS 视觉相似族；M-2 修复调真同色系）：bird↔butterfly（蓝翅系——蝴蝶取蓝闪蝶
  原型与鸟同蓝族）/frog↔ladybug（红绿斑点系——蛙背红斑与瓢虫红壳互染，红色扫除失效）/
  squirrel↔hedgehog（棕毛系）。型 2（及型 4 子型 2）干扰动物=目标种的相似种且半遮蔽
  ——孩子须辨局部特征（喙/触角、尾巴/刺），不能靠色相一眼排除。

## §R3 计数作答机制（型 2/3 及型 4 全部子型）

- 题面计数条（chips）**不铺总数进度点**：countAsk 题的 chip=动物图标+「？」徽标（答案不外显，
  审计「不显计数器」）；找到时 chip 仅 bounce 不点亮（型 1 原 cdots 点亮保持）。
- 找全 n 只（引擎 q.ansOpen=true）→ 计数条翻转为**数字作答条**：恒 5 钮 {2,3,4,5,6}
  （数字大字+骰子点阵双表征，零文字依赖），同时场景已找到动物**次第 bounce**（逐一计数支架）。
- 答对（num==n）→ 原 right/done 推进链；答错 → 轻反馈「再数一数」+动物再 bounce，
  **不记 miss 不扣星**（探索≠错精神延续：星级恒 3★、miss 恒 0 全款不变）。
- 首次弹条（每关第 1 次）数字钮次第高亮一遍（视觉预告可点，不指示正确答案）+动物 bounce。
- 语音：弹条 hid_cnt_q / 答错 hid_cnt_retry（新键上报主线注册，注册前 keyless=静默无害）；
  答对庆祝复用 hid_right（「全找到啦，眼睛真亮」语义贴合找全+数对）。

## §R4 记忆闪现机制（型 4）

- 每题开场闪现 2.4s（verify 页 SPEED=0.12 → 0.288s）：全部遮挡物半透明（opacity≈0.18，
  动物显形），场角睁眼图标；结束恢复遮挡+闭眼图标=开找。
- 闪现期点击=吞输入轻反馈（bump，同教学期语义 tapScene 返回 false）。
- 闪现是 UI 层纯视觉：引擎生成与 engTapScene 判定不受影响（确定性不变）。
- 语音：hid_mem_watch（新键上报）。

## §R5 引擎与钩子（game-core/game-main）

- engFoundTarget：找全时 countAsk 题 → q.ansOpen=true 返回 **'full'**（不推进）；
  非 countAsk（型 1）原 right/done 语义不变。
- **engAnswer(L, num)**（新）：仅 ansOpen 态受理；num==q.n → 推进返回 right/done；
  否则 q.ansMiss++ 返回 **'retry'**（不推进不记 miss）。
- engStars 恒 3 / miss 恒 0 不变。
- genOne 产物新增字段：countAsk/flash（从 PATS）、distractor.occlusion（型 2 系半遮蔽）。
- structWhy 扩展：型域 n/occ 区间、型 2 同系干扰+干扰遮蔽区间、型 1 干扰无遮挡、
  countAsk/flash 标志与 PATS 一致。
- HD 钩子：**HD.answer(num)**（作答入口，UI 真实判定链）；HD.quiz 增 ansOpen/ansMiss；
  HD.currentLevel 增 ansOpen；**HD.flashOn**（getter，复验等闪窗用）。

## §R6 语音键账（34 既有文案全不变照用；新增 3 键上报主线 gen_clips 中央登记）

| key | text | 用途 |
| --- | --- | --- |
| hid_cnt_q | 数一数，一共找到了几只呀 | 作答条弹出（新） |
| hid_cnt_retry | 再数一数吧 | 答错轻反馈（新） |
| hid_mem_watch | 看清楚哦，记住它们藏在哪里 | 闪现开始（新） |

题面（hid_q_×6 整句/hid_s_find+hud 段链 hid_an_×6+hid_s_he+hid_n_1..6）、干扰点名 hid_w_×6、
教学 hid_tut_watch/turn+hid_ear、提示 hid_hint、庆祝 hid_right——全部照用不改。
build.py clips 断言改为「34 必备键精确在册 + 总数 ≥34」（主线注册 3 新键后 37 亦过，防断言漂移）；
game-verify ⑩ 同步子集式。

## §R7 存档与迁移

**无档结构变化，无迁移 IIFE 需求**：档键 'ch-lv'（keyOf）、CH_LEN=5、STATIC_LEVELS=20、
日历语义、sv.hidden.tutSeen 全不动；难度章内容变化只影响未玩关的生成内容（难度改造目的本身），
已通关记录与新代码无矛盾态。运行态新字段（ansOpen/ansMiss/flash/countAsk）每关由 genLevel 重建，
不落存档。

## §R8 verify 适配（四层联动清单，grep `== N` 逐处同步）

- game-verify.js：①直驱找全后 countAsk 题须 engAnswer（含答错 retry 不推进）；
  ②occ 断言加 dch3 ⊆[0.35,0.60]；③章型分布新域（型 2 同系+countAsk/型 3 双种+countAsk/
  型 4 子型∈{2,3}+flash）；⑩clips 子集式（≥34）；新增 ⑪计数作答全链单元 ⑫闪现单元
  （flash 期 tapScene=false+结束可点）——total 10→12。
- verify_one_hidden.py：H1 章域（ch2 n∈[4,5]+同系干扰+countAsk/ch3 双种 n∈[4,5]+countAsk/
  ch4 子型∈{2,3}+flash）；H3 抽检加 ansOpen/retry/answer 语义；H4 驱动循环加答数步骤+
  flash 等待（HD.flashOn 轮询）；H2（遮蔽 30-60/互距 ≥256）/H4b（星 3）/H5（确定性）/H6 不变。
- gate_common22.py / verify_batch22.py：hidden 腿语义未变（G2 flat0 教学关型 1 无作答无闪现），
  零改动；G3 NCLIPS 传参由主线在注册新键后自行更新（本文件声明）。
- 关时长模型：本款无 SPEC_DUR 键（r19 countchick 特有），门禁⑤ N/A。

## §R9 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×720 桌面+竖屏）全过 12/12 ③selftest=verify_one_hidden
全绿（款内无 _selftest.py，等价自测即此）④verify_batch22 hidden 腿过 ⑤N/A（无时长模型）
⑥新语音 3 键上报 ⑦本文件 ⑧0 pageerror+0 http。
