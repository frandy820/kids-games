# SPEC-R25-HIDECUP · 藏猫猫杯子难度加深增补（r25，2026-09-21）

依据：AUDIT-56 行46 黄款判定「实测约 11s/题(ch4)，杯子换位追踪记忆点真实，
**2-3 杯+慢速偏易**」；行99 建议方向「①4 杯+4 换 ②提速档 ③双动物各记各的」。
校准：b34 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）——r21-r24 同口径。
本文件为 SPEC-BATCH34 §0.82/§1/§4 的 r25 修订版，与其冲突处以本文件为准；
§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「亮相→躲杯→换位→静止→点杯开杯」玩法骨架与教学链（tutWatchLevel/
tutTurnLevel 手工构造、watch→help→solo、`__hcDemoR`/`__hcTutSolo` 证据链、
教学慢速 SWAP_MS_TUT=1600 **零改动**），消除「2-3 杯+1100ms 慢速」的自降难度
通道——三个新认知维度落 dch3/dch4（dch1/dch2 基线全不动）：

- **杯数+换位数上探（审计①）**：dch4 量域腿 4 杯 4 换（旧 3 杯 3 换退役）。
  4 杯为布局上限（横排一行：桌面 slot 612/4=153px、竖屏 432/4=108px——杯 wrap
  按档缩窄至 138/102px，触摸面恒 ≥96×96、不溢出 #cups，CSS `#cups[data-cups="4"]`
  档位适配，§R4）。追踪对象 3→4、换位链长 3→4，位置跟踪负荷实质上升。
- **提速档（审计②）**：换位动画 1100ms 按章分档——dch1/dch2 恒 1100（基线）、
  **dch3=900、dch4=700**（每次 -200ms≈-18% 递进）。快换=视觉追踪窗口收窄，
  追踪负荷实质上升；教学演示 1600 慢速保留（教学链零改动）。档位函数
  `swapMsOf(dch)` 单点定义，presentQuiz/doReplay 共用（重演与初看同速——
  重看不泄答案也不降难度）。
- **双动物各记各的（审计③，选型=两步两问作答面）**：新题型 hidedual——两只
  动物（关主+关副）各躲一杯，**同串换位中各自追踪**；第一步问 A（点对
  返回 **'half'**，A 蹦出+确认链后不推进）→ 第二步问 B（点对='right'/'done'
  推进）。孩子在换位期须同时保住两条位置轨迹，第一步作答后仍须保住第二步
  答案（工作记忆保持）。
  - **选型理由（vs 一题双点判定）**：一题双点的「双点顺序↔动物对应」语义对
    pre-literate 儿童有歧义（哪次点击算哪只？），判定面引入人为歧义风险；
    两步两问的作答面与现有点杯完全同构（零新交互）、每步答案=唯一真值
    （derive 独立复算可判别）、r24 soundcount countdual 'half' 范式家族已验证，
    判定确定性可自证，故取两步两问。
  - **否决「两步间重演一遍」**：重演把双问拆成两个独立 hide 题（第二步新看
    新推），双轨迹记忆保持维度归零，宁难勿易口径下否决；孩子仍可自己点
    重看（3s 节流）自救——重演时 A 藏回完整重放、演毕恢复已开视觉（§R4）。

维度不叠同题（r24 口径）：量域腿=纯 4杯4换维（单动物）；hidedual 腿=c=3 s=3
（杯换参数留在旧 dch4 域，负荷在双轨迹工作记忆不在量域）；提速维全 dch3/dch4
共用。教学骨架（flat<0 迷你关+flat0 watch→help→solo）零改动；档键
kidsgame_hidecup/CH_LEN=5/STATIC_LEVELS=20/难度章 (ch-1)%4+1 循环/种子
mulberry32(flat×7919+311) 全不动；无迁移 IIFE。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键全不动）

| 难度章 | 章名 | 型 | 每关 5 题构成 | 换位 ms | 新认知维度 |
| --- | --- | --- | --- | --- | --- |
| 1 杯杯藏猫猫 | hide | 原样（c=2 s=1，flat0-4 教学链不动） | 1100 | 基线（原样保留） |
| 2 多换一次 | hide | 原样（c=2 s=2） | 1100 | 基线（原样保留） |
| 3 三杯换一换 | hide | 原样（c=3 s=2） | **900** | 提速档 |
| 4 藏猫猫大挑战 | **量域+双动物+提速** | 固定谱 qi0/2/4=hide **c=4 s=4** + qi1/3=hidedual **c=3 s=3**（双动物双问） | **700** | 4杯4换+提速+双动物各记各的 |

- CH_CFG 扩定：`{1:{c:2,s:1}, 2:{c:2,s:2}, 3:{c:3,s:2}, 4:{c:4,s:4,dc:3,ds:3}}`
  （dch4 主型 c/s=量域腿、dc/ds=双动物腿）；`DUAL_KINDS=['hide','hidedual',
  'hide','hidedual','hide']`（dch4 固定谱，qi 位确定性替代掷币——r24 同范式）。
- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：ch5/9/..=dch1、ch6/10/..=dch2、
  ch7/11/..=dch3（hide c=3 s=2+900ms）、ch8/12/..=dch4（新谱）。
- 旧 dch4「hide c=3 s=3 单动物」退役：其追踪负荷由 4杯4换腿（量域上探）+
  hidedual 腿（同 c=3 s=3 参数+双轨迹）双双承载。难度改造目的即内容变化，
  已通关档无矛盾态（§R7）。
- 章末预告文案随 ch4 内容更新：CHAPTERS[3].hint（预告 ch4）=『四个杯杯来啦，
  藏两只』；GEN_HINTS[3]（dch4 生成关）=『四个杯子换四次』；CHAPTERS[1]/[2]/
  [4].hint 与 GEN_HINTS[0-2] 原样（dch3 只提速、形态未变，文案不动）。
  C7 对账口径（hint[i]↔CHAPTERS[i+1]）不变。

## §R3 生成律扩定（§0.82 r25 修订——四方同步红线）

- 种子通道不变：mulberry32(flat×7919+311)，同 flat 永远同关。
- dch1/dch2/dch3 生成律**逐字节原样**（buildQuiz hide 分支参数域不动）。
- **anim2（关副动物）仅 dch===4 时取数**：`anim2=ANIMALS[floor(rnd()*5)]`，
  同掷值定值替换 `ANIMALS[(indexOf(anim)+1)%5]`（不耗种子——r24 countdual
  同款纪律）。dch1-3 不取数=**rnd 消耗序列与 r25 前逐位一致**（基线真不动：
  同 flat 同关内容逐字节不变）；dch4 关内容变化=难度改造目的本身。
- dch4 固定题型谱（qi 即题位）：kinds=DUAL_KINDS（3 量域+2 双动物，两形态
  每关恒在场——确定性保证）。
- hide 量域腿（仅 dch4）：c=4 s=4，start=ri(0,3)、swaps=genSwaps(4,4,rnd)
  （genSwaps 禁假换律原样：相邻对非全等、c≥3 禁同集合反向）。
- hidedual 腿（仅 dch4）：c=3 s=3；startA=ri(0,2)、startB=ri(0,1) 压缩采样
  （`startB>=startA 则 startB++` 保证互异，不耗重掷）；swaps=genSwaps(3,3,rnd)
  一串共用；answerA=derive(startA,swaps)、answerB=derive(startB,swaps)
  （双射恒推 **answerA≠answerB**——两只动物永不同杯，判定面无重叠）。
- quiz 字段扩展：hidedual 增 `startA/startB/answerA/answerB/animA/animB/phase`
  （phase 0=问 A/1=问 B，初始 0）；**`answer` 语义=当前步真值位置**：hide 恒=
  静态推导值；hidedual phase 0→=answerA，'half' 时引擎置 phase=1 并同步
  `q.answer=q.answerB`（autoSolve/救援 breathe/豁免窗 guard/教学帮指共用此
  单一口径，零分叉）。兼容字段 start=startA/anim=animA（旧断言面平滑）。
  `_miss` 双步累计（两步共用重试与星级口径）。
- **四方口径同步**：本节生成律必须 game-core.js（buildQuiz/genLevel）/
  game-verify.js（③⑧ SPEC 表独立对账+直驱分支+谱聚合）/ verify_batch34.py
  q_hidecup（主线 Python 独立复算——dch4 谱+hidedual 两步驱动）/ build.py
  （结构锚）四处同源同步，缺一即独立复验红。

## §R4 新机制（4 杯布局 / 提速档 / hidedual 两步流）

- **4 杯布局适配**：renderCups 布杯通道零改动（layoutCups 按实际 offsetWidth
  居中），CSS 档位适配 `#cups[data-cups="4"]`：桌面 wrap 138×172、杯 svg
  106×122、peek 88×88 bottom 84px；竖屏（orientation:portrait）wrap 102×150、
  svg 80×92、peek 76×76 bottom 50px。触摸面恒 ≥96×96（wrap 102×150 竖屏下限）、
  wrap 宽 < slot 宽（153/108）保证横排不溢出 #cups。杯身 SVG（cupSvg）inline
  width 被 CSS 覆盖（既有机制），renderCups 传参不变。
- **提速档**：`swapMsOf(dch)=dch>=4?700:(dch===3?900:1100)`；presentQuiz
  （非教学）与 doReplay 均按 cur.dch 取档——重演与初看同速（救援重演不降
  难度）。doSwapAnim 的 transition-duration 计算 **加 Math.round**（700×0.12
  浮点尾差会产出 '84.00000000000001ms' 非整串——verify ⑭ 精确断言配套）。
- **hidedual 两步流**：
  - 开题（presentQuiz）：亮相链 **[hc_n_A, hc_n_B, hc_show]**（3 段全 clip，
    窗 SHOW_WIN_DUAL=5400 ≥ 1440×2+150×2+1848+300=5328）；**两只轮流探头**
    （A 升 1.1s→缩回 0.4s→B 升 1.1s→缩回 0.4s，与名音链 A→B 顺序对应，
    peek 总窗 3800ms）；q-text=『<A名>和<B名>藏在哪里呀』；换位 700ms/次。
  - 第一步点对（engTapCup 返回 **'half'**）：A 杯 found（A 蹦出+杯抬）+
    chime+确认链 **[hc_right, hc_n_A, hc_n_B]**（3 段：找到啦真棒+小兔+小猫
    ——链尾名音=第二问预告，孩子听到「现在找 B」；窗 HALF_WIN=5800 ≥
    2232+150+1440+150+1440+300=5712）→ q-text 切『<B名>藏在哪里呀』→
    开放第二步点选。half 不推 step、不置 _answered、不入 retries（中间态
    非错误——r24 口径）；**half 解锁时重置救援钟 lastAct**（审查M2 r25 补
    口径：half 亦是正确作答，与 right 路径 §0.7a 一致——不刷则第一问思考
    ≥24s 的孩子 half 解锁后 idle 已越 30s，第二问被答案级救援即刻泄题）。
  - 第二步点对='right'/'done' 推进（确认链 [hc_right, **hc_n_B**]——末步
    名音=B）。任一步点错=wrong（miss+1 不换步可重点，豁免窗/guard 按
    q.answer=当前步真值自动分流）；第一步点对后点 A 已开杯=wrong（answerA
    ≠answerB 双射恒成立，无豁免歧义）。
- **救援两级适配（r24 审查 M1 核对结论）**：本款 doReplay(user) 完成段
  `if (user) lastAct = Date.now();` ——14s 方向级（user=false）**不刷** idle 锚、
  30s 答案级可达（r24 soundcount 实锤的同型坑本款现状源码即正确，verify ⑨
  加源码锚防回归）。答案级 breathe=correctIdx(q)=q.answer=**当前步**真值杯
  （phase 感知自动适配）。hidedual phase 1 重演：重演开始移除 A 杯 found
  （A 藏回完整重看换位，不露已开杯跟随移动）、演毕恢复 found（已完成步的
  视觉不吞）；恢复动作在 doReplay 内救援/用户共用路径，**不刷 lastAct**
  （user=false 分支语义不变）。
- **星级口径公平性论证（r25 定版，r24 同构）**：hidedual 两步各 1 个判定点
  （与 hide 单题 1 判定点同构）；'half' 不计 miss 不入 retries；wrong 同现行
  口径 miss+1 入 L.retries。dch4 每关判定点数=3×1+2×2=7（dch1-3 恒 5），
  错误机会面增幅与新维度负荷匹配；分档边界 0=3★/1-2=2★/≥3=1★ 与永不 0 星
  全不动。纯 dch1-3 关行为与 r25 前完全一致（向后兼容）。
- **autoSolve taps 口径**改为**判对次数**（'right'/'done'/'half' 均计）：
  dch4 关 taps=7，dch1-3 恒 5——_selftest P2 flat15 真实页端到端断言依据。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- buildQuiz 签名扩 `(dch, qi, rnd, anim, anim2)`：dch4 按 DUAL_KINDS[qi] 分腿
  （hidedual 腿 §R3 律）；hide 腿按 CH_CFG[dch].c/s（dch4=c4s4）。
- genLevel：`anim2` 仅 dch===4 取数（§R3 定值替换律）；quizzes 循环传 qi。
- engTapCup：判定 `i===q.answer`（hidedual 动态口径）；对且 hidedual phase 0 →
  `q.phase=1; q.answer=q.answerB; return 'half'`（不置 _answered 不推 step）；
  对且（非 dual 或 phase 1）→ 置 _answered 推 step，末题 'done' 余 'right'；
  错 → miss+1 返 'wrong'；null 语义原样。
- correctIdx/engStars/engWon 不动（§R4 口径论证；correctIdx=q.answer 自动
  phase 感知）。
- structWhy 扩（单题函数，签名 q,dch,qi 已有）：hide 分支 dch4 走 c=4 s=4
  （CH_CFG[4].c/s）；新 hidedual 分支（仅 dch4 且 DUAL_KINDS[qi]==='hidedual'
  ——他位出现='dualPos'；c=3 s=3、swap 形状域同款、startA≠startB∈[0,3)、
  answerA/B=derive 复算且互异、animA/B 池封闭互异、phase===0 初始、
  q.answer===q.answerA、_miss/_answered 初始干净）。**关级谱构成断言（dch4
  恰 3 hide+恰 2 hidedual、qi 位对应）不在 structWhy——在 game-verify ③
  聚合对账。**
- **HC 钩子**：quiz getter 扩 hidedual 字段（startA/startB/answerA/answerB/
  animA/animB/phase 快照拷贝；answer=当前步真值）；autoSolve taps 计 'half'
  （§R4）；tapCup 透传新返回值 'half'；replay/currentLevel/tutorial 原样。
  window.__hcDemoR/__hcTutSolo/__hcPerm/__hcWatchMs 证据链零改动。
- 主逻辑：setQText(q-text 动态)/presentQuiz dual peek 编排+chainWin 选档/
  swapMsOf 接入/uiTapCup 'half' 分支（HALF_WIN 演出锁+found+3 段链+q-text
  切换）/doReplay found 移除-恢复+Math.round/renderCups 双动物 peek 挂载。
  教学链/档键/日历/winFlow/celebrate/救援双锚结构零改动。

## §R6 语音键账（**零新增**——14 既有注入全不变照用）

| 维度 | 复用键 | 说明 |
| --- | --- | --- |
| hidedual 亮相链 | hc_n_A + hc_n_B + hc_show（3 段既有） | 两名音连播=双动物预告 |
| hidedual 第一步确认链 | hc_right + hc_n_A + hc_n_B（3 段既有） | 链尾名音=第二问预告（『小猫』） |
| hidedual 第二步确认链 | hc_right + hc_n_B（既有确认链形态） | 末步名音=B（家族「末步名音=当前答案」口径） |

**r25 零新语音键**：三维度全部复用既有 11 条 hc_（通用 6+名音 5）+core 3——
交付即全链可听，无注册等待窗口（对比 r23/r24 各 5-7 新键）。两名音互异
（animA≠animB 生成律保证）→ 链内无同键连播歧义。build.py clips 断言仍改
**子集式**：14 必备键精确在册+总数 ≥14（家族 r20-r24 范式统一，防未来加键
断言漂移）；game-verify ⑪ `===14`→`>=14`；_selftest P2 同步 ≥14/≥11。
新语音键清单：**空**（games=['hidecup'] 范围内无待注册项）。

## §R7 存档与兼容

**无档结构变化，无迁移 IIFE 需求**：档键 kidsgame_hidecup、levels 'ch-lv'、
CH_LEN=5、STATIC_LEVELS=20、日历语义、sv.hidecup.tutSeen 全不动；无新增
运行态子键（零新语音键→无一次性预告标记需求）。难度章内容变化（dch3 提速、
dch4 新谱）只影响未玩关的演出参数与生成内容（难度改造目的本身）；已通关
记录与新代码无矛盾态（r20-r24 同款声明）。运行态新字段（phase/answerA/B/
animA/animB）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep 计数断言逐处同步）

- **build.py**：clips `n_clips == 14` → `>= 14`（子集式，§R6）+14 必备键清单
  不变精确；新增 r25 结构锚——data 含 `const SWAP_MS_D3 = 900`/
  `const SWAP_MS_D4 = 700`/`swapMsOf`/`const SHOW_WIN_DUAL = 5400`/
  `const HALF_WIN = 5800` + 新窗推导断言（5400≥5328/5800≥5712）+CH_CFG[4]
  四键形态 `dc: 3, ds: 3`+`DUAL_KINDS`，engine 含 `'hidedual'`/
  `q.answer = q.answerB`（half 相位推进锚），main 含 `swapMsOf(cur.dch)`/
  `'half'` 分支/`if (user) lastAct = Date.now();`（M1 防回归锚）/setQText
  dual 文案/`Math.round(durMs * SPEED)`（浮点整串锚），head 含
  `#cups[data-cups="4"]`（4 杯布局锚）；教学分账 TUT_SUM 与全部既有窗断言
  原样（教学链零改动）。
- **game-verify.js**：头注①③⑧⑨单元描述同步（dch4=量域+双动物+提速谱）；
  SPEC_CH 扩 `{4:{c:4,s:4}}`（hide 腿口径）+新 `SPEC_KINDS`（dch4 谱独立
  重列）+SPEC_CHAPTER_HINTS[3]/SPEC_GEN_HINTS[3] 新文案；① sims 增 flat15
  （dch4 qi0 c=4 双视口布局——4 杯不溢出/触摸面实证）+clips `>=14`；
  ③ 40 关对账 dch4 分支重写（qi0/2/4 hide c=4 s=4 域+qi1/3 hidedual c=3 s=3+
  startA≠startB+answerA/B 独立复算互异+animA/B 池互异+phase=0 初始+
  q.answer===answerA）+直驱分支（hidedual 先 tapCup(answer)='half' 再
  tapCup(answer)=right/done——q.answer 动态口径直读）+谱构成聚合（dch4 恰
  3 hide+2 hidedual、qi 位对应）；⑧ gen c/s 域检查按谱分支；⑨ winOk 增
  SHOW_WIN_DUAL/HALF_WIN 下界+swapMsOf 三档断言（1100/900/700+教学 1600），
  contractOk 增 r25 源码锚（swapMsOf/q.answer=q.answerB/'half'/M1 锚/
  Math.round/dual q-text）；**新增三单元**——⑬ hidedual 两步作答单元
  （flat15 真实 UI：qi1 形态+亮相链 3 段+q-text 双名+tapCup(answerA)='half'→
  phase=1/q-text 切 B 名/A 杯 found+确认链 3 段/half 后 miss=0 step 未推/
  第二步错（点 A 杯）wrong miss=1 不换步/第二步对 'right' 推进 qi2）、
  ⑭ 提速档单元（flat5/flat10/flat15 开题后 wrap transitionDuration 实读
  ='132ms'/'108ms'/'84ms'（=1100/900/700×SPEED 0.12 精确整串——Math.round
  配套）+swapMsOf 档位函数断言）、⑮ hidedual 帧内容+重演回归单元（flat15
  qi1：双动物两 host 挂杯对位对账 data-cup∈{startA,startB}/data-pos=derive
  复算/svg g[data-anim] 对应+half 后 found+replay() 重演毕 found 恢复+
  __hcPerm 排列对账+第二步对推进）；total 12→**15**（新旧对照：原①-⑫
  12 项；+⑬⑭⑮ 各 1）。
- **_selftest.py**：**补 MUTE 静音双保险**（r19 红线——两相页 goto 前挂
  init_script+种档 sound:false/tts:false/vol:0，块体=任务书指定原文，键
  kidsgame_hidecup）；P2 clips 断言改子集式 `n_clip>=14 and hc_keys>=11`；
  P2 新增 flat15 真实主流程块（等 flat0 收尾层落定→HC.start(15)→实测开题
  时长（dch4 演出窗真实值）→autoSolve taps==**7** done→存档
  levels['4-0'].stars==3）——真实页 4杯/提速/双动物端到端证据（r23 P2-1
  教训：时序参数须真实页实测，不止 verify 提速页）。
- **verify_batch34.py q_hidecup（主线职责，本文件声明适配清单不实施）**：
  dch4 分支改新谱（hide c=4 s=4 域；hidedual 两步驱动——tapCup(q.answer)
  得 'half' 后再 tapCup(q.answer) 答第二问）；谱聚合改 {hide,hidedual}；
  WRONG_WAIT/LB 链窗不变（错链构成未动）；gate_common34 G3 clips_n=14 不变
  （零新键）。

## §R9 时序参数实测（r23 P2-1 红线：换位动画提速=时序参数，写明页内实测方法与数值）

- **档位定义**：swapMsOf：dch1/dch2=1100（基线不动）、dch3=900、dch4=700、
  教学恒 1600（SWAP_MS_TUT）。递进纪律：每档 -200ms（-18%/-22%），4-6 岁
  smooth pursuit 追踪 2 物体互换的中速域下探；700ms/次×4 次=2.8s 追踪窗
  （vs 旧 1100×3=3.3s——窗口收窄 15% 且对象+1，双重负荷）。
- **页内实测方法①（verify ⑭，提速页 SPEED=0.12）**：开题演出后实读
  `cupsEl.querySelector('.cup-wrap').style.transitionDuration`——doSwapAnim
  逐次设定的终值，期望 '132ms'(dch2 1100)/'108ms'(dch3 900)/'84ms'(dch4 700)
  精确整串（Math.round 配套防浮点尾差）。判别力：档位接错/常量改错即 FAIL。
- **页内实测方法②（_selftest P2 flat15，真实页 SPEED=1）**：HC.start(15) 至
  首题可交互（!locked && Date.now()>=showUntil）实测时长——flat15 qi0=**hide 腿**
  （亮相窗 SHOW_WIN=4300，非 dual 腿 5400），期望≈4300+4×700+800+140 锁余量
  =**8040ms**（审查M1 r25 勘误：初版误写 8240，算术修正；实测 8061ms 吻合）——
  其中 4×700=2800ms 换位窗即 dch4 提速档的**真实页端到端实证**（若仍 1100ms 档
  则为 4300+4400+800+140=9640ms；断言带宽 7500-**8840**=两档中值——1100 坏档
  必 FAIL，判别力成立）；实测数字随交付报告上报。dual 腿（qi1/3）真实页开题窗
  5400+3×700+800=8300ms 由 autoSolve 全程（7 判定）端到端覆盖，verify ⑬ 提速页
  （×0.12）单独断言其亮相链与两步流。
- **HALF_WIN=5800 推导**：half 演出罩确认链 [hc_right 2232+150+hc_n_A 1440+
  150+hc_n_B 1440+300]=5712（名音 max 口径；实长以 _clipdur34 为准——零新
  键无注册后回填需求）。
- **SHOW_WIN_DUAL=5400 推导**：亮相链 [名音 max 1440×2+150×2+hc_show 1848+
  300]=5328；两只轮流探头总窗 3800（2×(1500+400))≤5400 内容纳。
- **可跟性风险**：700ms 快换对部分 5 岁儿童可能过快——救援两级（14s 重演/
  30s breathe+重演）与重看按钮（3s 节流）为兜底；真机儿童数据回归时复盘
  （§R11）。

## §R10 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×800+800×1180——verify sims 为
#game 盒模拟；**真竖屏视口 800×1180 由 _selftest P3 页实测**（审查M3 r25：
portrait 媒体查询只应视口宽高比，盒模拟对其无效——P3 断言 4 杯 wrap 102×150
档+触摸面 ≥96+overflowX≤0+截图 real_dch4_portrait.jpg））全过 **15/15**
③_selftest 全绿（含 MUTE/P2 flat15 taps=7+开题时长实测/P3 真竖屏）④verify_batch34
hidecup 全绿（主线，按 §R8 适配后）⑤gate G3 n=14（零新键，不变）⑥新语音
键清单=**空**（无待注册项）⑦本文件 ⑧0 pageerror+0 http。

## §R11 风险与未验证项（如实）

- 700ms 快换+4 杯对部分儿童可能偏难：宁难勿易口径下接受，救援两级+重看
  兜底；真机儿童数据回归时复盘（r24 同款声明）。
- 4 杯竖屏杯 svg 80×92 偏小：触摸面（wrap 102×150）达标、杯形暖橙+条纹
  可辨；视觉验收以 _shots 截图（P2 real_dch4.jpg）+verify sims overflowX≤0
  实证，用户真机观感待回归。
- hidedual 第一步点错后豁免窗（5154 真时钟）内第二错被吞——与单动物口径
  一致（家族 I 补），无新增风险；错链 flat≥3 10s 节流照旧。
- 重演恢复 found 在救援路径（user=false）不刷 lastAct——M1 同型坑源码级
  防回归锚已入 verify ⑨；行为级答案级 30s 可达性未做真实页 105s 静置实测
  （r24 曾实测坐实同型坑，本款源码分流结构与其修复后一致）。
- 主线 verify_batch34/gate 适配未实施（§R8 声明），Executor 自测不含其结论。
