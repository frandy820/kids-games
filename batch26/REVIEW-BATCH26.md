# batch26 独立反方审查报告（sign 交通标志 / season 季节衣橱 / calendar 日历小星）

- 审查人：独立反方审查（core-adversarial-reviewer 流程），默认不认同前序「门禁 3/3×3、复验 11/11×3、回归 7/7 全绿」结论
- 基准真值：`F:/claudecode/projects/active/kids-games/batch26/SPEC-BATCH26.md`（§0.61-§0.63 封闭表 + §4 实长表）+ batch21 §0 家族承用条文
- 方法：源码逐行（三款 `_src` 全 5 文件 + 共享 design/core.js）／18 条 clip 用 python mutagen 量化对账 SPEC §4＋4 条 base64 身份全等比对／TTS 拼句用 powershell System.Speech 渲 wav 实测时长／playwright 无头独立 launch（单 page 串行、用毕即关）对 verify 页与常规页做运行时实证（救援双锚、竞态时间线、语义反馈活体、家长门/存档/限流）
- 结论总览：**fatal 0 ｜ major 5 ｜ minor 4**。无崩溃、无阻断、无离线违规；5 条 major 集中在**错反馈语义层与生成关预告**，其中 M1+M2 耦合（只修其一仍留假话/空窗）。

| 级别 | 编号 | 标题（一句话） |
|---|---|---|
| major | M1 | calendar 错选方向句内容错：反向题未来侧方向完全颠倒（4/4 实证）+ 接龙题「已经过啦」对未过项字面假（含真实游玩活体） |
| major | M2 | season/calendar flat≥3 错反馈被通用 clip 替换：SPEC §0.62/§0.63 的主线语义反馈在 ch2-ch4 全程缺失（calendar 方向句在真实游玩中不可达；同批 sign 却保留语义——同批不一致） |
| major | M3 | 生成关章末预告 GEN_HINTS 与实际随机 dch 失配：calendar 4/4 章末全错；家族 F「预告=下一章实况」违反 |
| major | M4 | 错反馈链被 14s 方向级救援掐断竞态：sign 实测 6028ms 链在 1246ms 处被读题 clip 替换（引导句一字未播）；三款两轨同型 |
| major | M5 | sign「注意儿童」SVG 单人+两红点，违反 SPEC §0.61「黄三角**双人**」封闭表真值，削弱 ch3 近对辨析 |
| minor | m1 | season 不适理由个别格知识欠准（冬天点长裤答「长裤是秋天穿的哦」等 3 处） |
| minor | m2 | 「SPEC §4 明示豁免/容忍掐断」注释引用失准（真值在 batch21 §0=错点 1000ms 防重入窗，且未授权整链被掐） |
| minor | m3 | verify ⑪ clip 校验只查 dataURI 前缀+条数，无时长辨别器（本批实测 18/18 全等无事故，断言面留洞） |
| minor | m4 | estMs 公式三款口径不一（sign +600 / season +300 / calendar 纯汉字+600；均保守达标，建议统一） |

---

## Major 1（calendar）——错选方向句内容错：反向题未来侧方向颠倒 + 接龙题「已经过啦」字面假

**位置**：`calendar/_src/game-data.js:86-95`（dirText），模板定义 `game-data.js:61-65`（DIRFB）

**证据一（纯函数真值表，verify 页内直测 14 例）**：判别标准=句子字面真假（模板语义 vs 所点项与答案的真实相对位置）。

- 反向题（day_rev/month_rev）点**未来侧**（base 之后 1-2 位的项）4 例全部方向颠倒：
  - day_rev base=星期五（答案=星期四），点**星期六**→「**它在前面**，昨天在后面」——星期六在星期四后面，句面完全反了；
  - day_rev base=星期五 点**星期日**→「它在前面」（同上反）；
  - day_rev base=星期日（答案=星期六）点未来侧同型反；
  - month_rev base=六月（答案=五月）点**七月**→「**它在前面**，上个月在后面」——七月明明在后面。
  - 根因（L93-94）：`const distB = (bi - wi + fam.length) % fam.length; return distB === 0 ? tab.after : tab.before;`——只把 base 本身分到 after，base 前方的 bi+1/bi+2（distB=6/5）全部误入 before。
- 接龙题（fwd）点**未来侧**（base 后 2 位起）3 例字面假：
  - day base=星期三（答案=星期四），点**星期五**→「**这个已经过啦**，它在前面」——对 6-7 岁儿童，「星期五已经过了」是假话（在星期三语境下星期五还没到）；点星期六、星期日同型。
  - 根因（L89-90）：`dist <= 1 ? DIRFB.fwd.before : DIRFB.fwd.after`——「已经过啦」模板被套到所有非近侧项上，而 fwd 的错项大多在未来侧。
- 14 例中 7 例字面假（rev 未来侧 4 + fwd 未来侧 3）。

**证据二（真实游玩活体，非改状态注入）**：
- 种子存档进入 flat=0 第 1 题（day，base=星期三，答案=星期四），点干扰项星期五（buildQuiz 的 near2=base+2 恒在场，`game-core.js:71-86`）→ 页面实际播报 **SAY「这个已经过啦，它在前面」**。即第一关第一题、零修改、孩子必经路径上就能听到这句假话。
- 反向题 UI 层复现：flat=10 真题（day_rev base=星期二），点星期日→「它在前面，昨天在后面」（方向颠倒实锤，经临时置 flat=0 绕过 M2 的 clip 替换后测得——正因 M2，该错句在真实 flat≥3 目前播不出来，两问题耦合）。

**影响**：calendar 是「时间顺序教学」款，错选反馈是主要教学通道之一；方向颠倒句=把错误关系教给孩子，比不说话更糟。fwd「已经过啦」对未来项=时态假话。注意 SPEC §0.63 自身的二元模板（「答案前/后」两类句）在 fwd 未来侧也有歧义（见修复建议第 2 点），实现并非照抄即对——按 SPEC §3「所点项在答案前/后」分区才正确。

**修复建议（只给改法，不动代码）**：
1. `calendar/_src/game-data.js:86-95` dirText 重写分区（对 day/month 的 fwd 与 rev 都适用，含环跨界）：
   - fwd：`const after = !(wi === bi || wi < ai); return after ? DIRFB.fwd.after : DIRFB.fwd.before;`（base 与过去侧→before，未来侧→after；星期二→before，字面真）
   - rev：`const after = (wi === bi) || (wi > ai); return after ? tab.after : tab.before;`（用 fam 内线性下标比较：base 与未来侧→after「它在后面」，答案前方→before；跨环界如 base=星期日、答案=星期六时线性序仍给出正确分区）
   建议同步把 verify ⑮（`calendar/_src/game-verify.js:341-357`）真值表断言从只测 base/过去侧扩到**每 kind 至少含 1 例未来侧**——当前断言用例恰好全落在实现正确的分区上，这正是漏检根因。
2. fwd.after 文案本身建议去掉时态断言（SPEC 模板歧义，需你定稿）：如「它排得太靠后啦，找它前面的」。改动需同步 `game-data.js:61-65` DIRFB、`calendar/_src/build.py` 静态断言里的句长表、verify ⑮ 模板串。

---

## Major 2（season+calendar）——flat≥3 错反馈语义被通用 clip 替换，主线语义反馈在 ch2-ch4 全程缺失

**位置**：`season/_src/game-main.js:34-39`（sayW）、`calendar/_src/game-main.js:34-39`（sayWrong）；对照 sign `sign/_src/game-main.js:35-40`（保留了语义）

**证据（源码+运行时活体）**：
- season sayW：flat<3 走 `voice.say(dissentText(所点物品, 题面季))`（不适理由，绑定所点物品）；flat≥3 走 `play('sea_wrong')`（「这个季节不合适哦」，**不区分点了什么**）。运行时实测：flat=0 点长裤→SAY「长裤是秋天穿的哦」（语义轨在）；flat=10 点错→PLAY:sea_wrong（纯通用句，零语义）。
- calendar sayWrong：flat<3 走 `say(dirText(...))`（方向句）；flat≥3 走 `play('cal_wrong')`。运行时实测 flat=10 反向题点未来侧→PLAY:cal_wrong（无方向句）。
- **SPEC §0.62**：「选错=**语义反馈绑定所点物品**（按物品在其所属季外的季节给不适理由，不否定物品自身）」——无 flat 限定；**SPEC §0.63**：「错选反馈=方向语义（所点项在答案前/后）」——同样无 flat 限定。flat≥3 替换为通用句无 SPEC 依据。
- **同批不一致**：sign 的 sayW flat≥3 分支是「10s 节流但保留 GUIDE 语义链」（按标志形状颜色家族引导），同批三款两套做法，说明这是实现分叉而非设计定版。
- **calendar 反向/跨界章（ch3+）恰是最需要方向线索的章**，从第 3 关起孩子全程听不到任何方向提示。反证实现者自己也知道语义句该在：verify ⑮ 的 UI 测试需要先伪造 `cur.flat=0` 才能让方向句可达（`game-verify.js` ⑮段），真实流程测不到。
- **verify 把偏离固化**：season `game-verify.js:203-212`（④b）显式断言 flat≥3 = sea_wrong——断言照实现写（测试断言同源陷阱），把偏离变成了「预期」。

**影响**：SPEC 两条主线反馈（不适理由教学、方向线索教学）在游戏 90% 的关卡里（flat 3-19 静态+生成关）不存在；season 48 格、calendar 方向句精心构建的语义表沦为 flat 0-2 的装饰。M1 的错句目前被 M2 压住播不出来，**修 M2 必须同时修 M1**，否则把假话放出来。

**修复建议**：两处 flat≥3 分支改为「保留 10s 节流，但节流对象换成语义句本身」——season `game-main.js:34-39` 改为 flat≥3 时 `voice.say(dissentText(...))`（受同一 10s 节流），与 sign 同构；calendar `game-main.js:34-39` 同理改 `say(dirText(q, word))` 节流。同步改 season verify ④b（`game-verify.js:203-212`）：断言两 flat 段都产出语义句、节流窗 10s 内重复错点不再重播（而非断言切 clip）。

---

## Major 3（三款）——生成关章末预告 GEN_HINTS 与实际随机 dch 失配

**位置**：nextHint——`sign/_src/game-main.js:214-218`、`season/_src/game-main.js:238-242`、`calendar/_src/game-main.js:212-216`

**证据（页面直读 genLevel.dch 与 hint 文案比对，mulberry32 种子复算一致）**：
- calendar：flat 24/29/34/39 四个章末的 nextHint 声称的下一章型与实际 `genLevel(flat+1).dch` **4/4 全部不符**（预告 dch2/3/4/1 vs 实际 dch1/2/2/4）。例：flat24 章末预告「反着数」（dch3），实际下一关是接龙（dch1）。
- sign/season：flat 24/29/34 章末碰巧匹配（这三个种子下 dch 恰好对上），flat 39 章末**失配**（claim dch1 vs 实际 dch4）。
- 根因：三款 nextHint 对生成关一律 `GEN_HINTS[(ci+1)%4]`（章序推进），而 genLevel 的生成关 dch=`ri(rnd,1,4)` 随机（`sign/_src/game-core.js:113-123` 等），两个序列互不相干，匹配纯属种子巧合。
- **verify ⑬ 无行为约束力**：只查章末 hint 含「下一章关键词」（`sign/_src/game-verify.js:329-340` 等），不对照实际 dch——b22 colormix 教训（家族 F）要求的 C7 行为对应断言没有落地，四款里 GEN_HINTS[k]↔dch=k+1 的表建了、用的时候却没对上。
- 触达门槛：生成关 flat≥20 需家长面板多玩解锁（默认日限 6/12 关到不了），故非每日主路径，但 bonus 是设计内的正式玩法，且 calendar 四个章末全错非巧合可辩。

**影响**：章末预告是家族 F 的学习预期管理（预告什么→来什么）；失配=预告谎报下一关内容，削弱预告信任；同时是家族契约 F 的行为层违反（b22 复发）。

**修复建议**：三款 nextHint 的生成关分支（如 sign `game-main.js:217`）改为实算：`return GEN_HINTS[genLevel(flat + 1).dch - 1];`（genLevel 纯函数确定性，同 flat 恒同 dch，无副作用）。verify ⑬ 补一条强断言：对 flat∈{24,29,34,39,...}，章末 hint 串 === GEN_HINTS[genLevel(flat+1).dch-1]。

---

## Major 4（三款）——错反馈链被 14s 方向级救援掐断竞态

**位置**：错路径 `sign/_src/game-main.js:178-187`、`season/_src/game-main.js:200-209`、`calendar/_src/game-main.js:174-182`；救援 interval `sign:356-379`、`season:381-404`、`calendar:361-384`

**证据（sign 常规页，voice spy 时间线，ms）**：
- 布景：置 lastAct=now-13400、lastDir=now-16000（模拟孩子在题面停留 ~13s 后点错——真实场景：听题、犹豫、点错）。
- t=4 `play(sgn_q)`（题面）；t=631 点错 → `queue(["sgn_wrong", {key:null,text:"蓝牌子说，这样走"}])`（错反馈链=2808ms clip + 150ms 间隔 + 引导句 TTS ≈6.0s）；**t=1877 `play(sgn_q)`——方向级救援到点触发读题，把链掐断**：错 clip 只播了 1246/2808ms，引导句 TTS 一字未播。
- 链总时长 6028ms（错 clip 2808+150+guide estMs），被掐时仅过 1246ms。触发条件=错点时刻方向级 idle 已 >7.7s（14s 窗减链长）——即「听题后犹豫 8 秒以上才点错」这个完全正常的儿童行为必然触发。
- 同型面：season flat≥3 sea_wrong（2304ms clip）、season flat<3 / calendar flat<3 的 TTS 语义句（3-4s，speechSynthesis 被读题 cancel）、calendar flat≥3 cal_wrong（2088ms）都在救援可掐窗内；答案级 30s 救援同样可在错点后触发（错点发生在 idle>23.7s 时）。sign 链最长（6.0s）受害最重。
- 双锚本体无恙（同一实验验证）：方向级救援不动 lastAct（lastActUnchanged=true）、lastDir 独立前进（true）——**锚结构正确，问题是错反馈链没有豁免窗**。

**影响**：错反馈是最重要的教学时机，被读题声覆盖=孩子点错后听到半句「不对」+ 立刻复读题面，引导信息丢失。它与 b25 已沉淀的「语音掐断链」同族，但方向是救援→反馈（此前修的是反馈→反馈）。

**修复建议**：错路径起播时记链豁免时间戳，救援 interval 早退条件加守卫——sign `game-main.js:178` 处 `wrongChainUntil = Date.now() + 6300;`（=错 clip 2808+150+guide estMs+300），`game-main.js:356-357` 早退条件追加 `|| Date.now() < wrongChainUntil`；season（flat<3 TTS 段约 4s / flat≥3 2304+300）与 calendar（同构，各约 3.5-4.3s）按各自实长设 wrongChainUntil。变量与 lastAct/lastDir 同层声明（module 顶层 let）。注意：链守卫只挡救援读题，不挡孩子主动点对/点错（主动交互仍应打断反馈，维持现状）。

---

## Major 5（sign）——「注意儿童」SVG 单人+两红点，违反 SPEC「黄三角双人」封闭表

**位置**：`sign/_src/game-data.js:159-162`（child SVG）、`game-data.js:226-229` 附近（MEAN 描述）

**证据**：SPEC §0.61 封闭表明文「注意儿童(黄三角**双人**)」。实现为单个 `FIG(60,80,1.0,'run')` 奔跑小人 + 头顶两侧两个红点 circle（注释自辩为「双丫辫」区分点）。GB 576 真实标志为两个奔跑儿童；红点在 118px 卡片上渲染为 ~8px 圆点，儿童视角更像气球/球而非第二个人。同族对照：ped（注意行人）=单个行走成人——ch3「ped↔child 近对辨析」的两个标志因此都是「单人」，设计上本该承担区分的双人特征缺失（剩下 walk vs run 姿态与红点）。

**影响**：封闭表真值违反；ch3 近对辨析（SPEC 定义的难点章）可辨性弱化；教育内容与真实世界标志（双人）不一致。

**修复建议**：`game-data.js:159-162` 改为双奔跑人：删除两个红点 circle，用近大远小双人 `FIG(48,80,1.0,'run') + FIG(76,86,0.75,'run')`（贴近 GB 576 双小孩意象）；同步 MEAN.child 文案（若提及辫子/红点）；建议 verify ⑪ 段加一条轻量自检：child SVG 内 FIG 组数 === 2。

---

## Minor 1（season）——不适理由个别格知识欠准

**位置**：`season/_src/game-data.js:97-108`（DISSENT_OVERRIDE）、`game-data.js:78-95`（DISSENT_CLS）

**证据与活体**：冬天点长裤→SAY「**长裤是秋天穿的哦**」（L105 覆盖句；冬天穿长裤完全正常，这句对冬天语境是错的归属断言，且与同文件 longsleeve winter 覆盖句「冬天要穿厚外套呀」的互指正确物品模式不一致——长裤 winter 格照抄了 spring 格）。另外：秋天雨具→「秋天不常下雨哦」（RAIN 模板 L113；秋雨在华西/华南常见，全国性表述欠准）；春天遮阳帽→「春天用不上遮阳帽哦」（NOUSE；春阳同样晒）。
**影响**：个别格给 6-7 岁孩子不准确的生活常识；类×季节矩阵断言（verify 结构自检）只查模板归类不查句义，拦不住这类问题。
**修复建议**：`game-data.js:105` pants.winter 覆盖句改为互指正确物品模式，如「冬天要穿厚外套呀」（与 longsleeve/vest winter 格统一）；RAIN 模板句「{季}不常下雨哦」建议弱化为「{季}少下雨哦」；sunhat.spring 若改则同批处理。均需重跑 build estMs 断言（句长 ≤11 码点）。

## Minor 2（三款）——「SPEC §4 明示豁免/容忍掐断」注释引用失准

**位置**：`sign/_src/game-main.js:15-16`、`sign/_src/build.py:63`、`season/_src/game-main.js:15`、`calendar/_src/build.py:60,104`

**证据**：多处注释声称错反馈窗 1000ms/链可被打断是「SPEC §4 明示容忍」。核对 SPEC-BATCH26 §4 全文无任何错反馈豁免表述；家族真值在 **batch21 §0 L9**「错点防重入窗 1000ms」（`SPEC-BATCH21.md:9`）——条文真实存在但（a）引用位置错（§4→实为 batch21 §0）；（b）1000ms 是**防重入窗**（同一错点 1s 内不重复计），从未授权「错反馈链整体可被救援/读题掐断」。
**影响**：文档失准直接关联 M4——正是这条注释让 6s 链被 1246ms 掐断的实现通过了自检（b22 colormix「注释与真值脱节」同型）。
**修复建议**：四处注释改为如实引用：「错点防重入窗 1000ms（batch21 §0 L9）；链防掐断守卫见 M4 修复」。

## Minor 3（三款 verify）——clip 校验无时长辨别器

**位置**：`sign/_src/game-verify.js:307-315`（⑪）、season/calendar 同段

**证据**：⑪ 只断言注入 clip 的 dataURI 前缀（`data:audio/mp3;base64,`）与条数，不校验内容/时长身份。本批我用 mutagen 独立量化 18 条 clip 全部与 SPEC §4 逐条全等（2448/2544/2400/2808/2304/2088/3312/…），4 条抽查 base64 与源文件逐字节全等——**本批无实际事故**；但 b25 坑③的教训（clip 身份辨别器=duration 而非前缀/尾匹配）没有沉淀进 verify 断言面。
**修复建议**：verify ⑪ 增加：对每条注入 clip 解码后时长与 SPEC §4 表差 ≤60ms（页面端可 new Audio +loadedmetadata 取 duration；build.py 侧也可加 mutagen 静态对账，构建环境已有 python）。

## Minor 4（三款）——estMs 公式口径不一

**位置**：`sign/_src/game-data.js`（estMs=n×345+600）、`season/_src/game-data.js:132`（n×345+300）、`calendar/_src/game-data.js`（纯汉字×345+600，标点不计）
**证据**：三款三种口径（字符计数法也不同：sign 含标点、calendar 只数汉字）。核验结果均保守达标（sign 判对窗 5400≥estMs(10)=4050；season 5400≥4095；calendar 动态窗 800+estMs+300 覆盖最长题面句 5085）——**无违例**，纯一致性问题。
**修复建议**：统一为「全码点×345+300」（最保守）或至少在各自 build.py 注释里写明口径差异原因；改 sign/calendar 公式时须重跑对应静态断言（均为 ≥ 关系，收紧不破）。

---

## 无需修复项清单（查过、没问题）

1. **18 条 clip 实长对账**：mutagen 实测与 SPEC §4 表逐条全等（含 sgn_right 2448/sea_right 2544/cal_right 2400/sgn_wrong 2808 等）；注入机制=inject_clips.py key→同名文件映射，4 条抽查 base64 与 `voice/clips/*.mp3` 源文件全等——clip 身份无问题（b25 坑③机制上不适用，断言面问题另计 m3）。
2. **构建一致性**：三款 `index.html` 与 `_src`+core+clips 拼接逐字符一致，无陈旧构建漂移。
3. **verify 页 3/3 PASS 复现**：sign 54/54、season 55/55、calendar 56/56，layoutOk 全 true、unit/smoke 无失败——前序「门禁/复验全绿」结论本身成立（其断言覆盖缺口已在 M1/M2/M3/m3 指出）。
4. **判定/奖励语音窗全部达标（家族 H）**：SAPI 实测最长拼句 2955-3655ms（含「黄三角，前方有小朋友」3655ms），判对窗 5400（sign/season）/calendar 动态窗全部 ≥ 实测+1000ms 余量；estMs 345ms/字与实测 296-439ms/字相符；三款 build.py 均有「窗≥estMs(最长句)」静态断言且数字验算正确。
5. **winFlow 链窗**：celebrate 2620（core.js 2300+320 源码核）+400=3020 ≥ 三款 right clip 实长+300（2748/2844/2700），数学正确。
6. **教学窗**：watch/turn 延迟窗全部 ≥ clip+300（sign 3900/2200、season 3550/2100、calendar 3612/2100）；其中 calendar watch 窗 3612=3312+300 **恰好压线零裕量**、turn 窗裕量 24-48ms 薄——当前通过，若未来重合成这几条 clip 需复核（提示，非问题）。
7. **救援双锚（家族 B）**：运行时实证方向级 14s（lastDir 独立、不动 lastAct）、答案级 30s 自然节流、救援读题不重置 lastAct 防自喂、主动读题/开局重置 lastAct（b25 M4 承接）——锚结构全部正确（链豁免缺失另计 M4）。
8. **吞输入轻叮+容器 bump（家族 D）**：locked/demo 期吞点均伴 bump，教学链锚点与时序窗无恙。
9. **家长门+存档+限流（家族 C）**：三款 saveKey `kidsgame_<game>` v=1.0 预置读出正确；首日限 6、bonus 5→限 11→还原 6 实测正确；家长门两位数加法（实测 30+48/49+12/36+18，11-50 域+数字键盘）；面板可开、多玩入口在。
10. **知识正确性**：sign 其余 11 个标志含义与先验自洽（红圈禁令/黄三角警告/蓝指示三分族，颜色引导句与族一致）；season 16 物品归属与 SPEC §0.62 全等且数学先验自洽（4×4=16 每物品恰属 1 季）；calendar 顺序表、跨界（日→一/十二月→一月，答案=环首 verify ③ 专测覆盖）、接龙/反向出题结构正确。
11. **封闭集独立断言纪律**：verify 的 SPEC 表为独立重列（sign 12 标志含义表、season 归属表、calendar 顺序表），非 import 实现——断言与实现不同源。
12. **ch3 近对/近季强制在场**：sign 近对必入干扰、season 出题季相邻季物品必入（autumn 双近季春+冬都入）、calendar 答案相邻项（base）恒在场——verify ②③ 独立推导断言在位。
13. **防呆**：双错防重入（1000ms 窗）、99 越界（engTapOpt(99)→null+pop+bump）、快速连点（locked/during-judge 吞+fire-and-forget 测法覆盖）、星级口径（0 错 3★）、演示实证。
14. **确定性生成**：mulberry32 种子（sign/season flat×7919+13、calendar flat×7919+401），同 flat 两次生成 JSON 全等，页面 dch 与独立复算一致。
15. **完全离线**：三款无 http(s) 外链、无网络字体/图片（全内联 SVG+data URI 音频）。
16. **sign dch1 题面轮换池 4<5**：尾题与首题同标志——SPEC 未禁相邻互异只约束相邻两题（structWhy 已查），注释自知，非问题。

---

## 修复顺序建议（耦合关系）

1. **M1+M2 必须同批修**（先修 M2 会把 M1 的假话放到全关卡可听；只修 M1 则方向句依旧 ch2-4 不可达）；
2. M4（链守卫）独立可修，修完 m2 注释一并改；
3. M3（nextHint 实算）独立可修；
4. M5、m1 内容项随时可修；m3/m4 断言与口径统一趁 verify 改动顺带做。

全部修完建议重跑：三款 verify 页（补强后的 ⑬⑮④b 断言应先红后绿）+ 一轮 flat 0/10/24 章末路径运行时抽测 + build.py 静态断言。

*审查过程证据：`F:/claudecode/output/batch26-review/`（runtime_results.json=运行时实测原始数据；measure.py=clip 量化；calc_dch*.py=种子复算；retest_semantic.py=语义活体）。*
