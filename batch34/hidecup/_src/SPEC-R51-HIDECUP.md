# SPEC-R51-HIDECUP · 藏猫猫杯子难度曲线上移改造（r51，2026-09-24）

依据：用户反馈（2026-09-24）「前几关太简单」，难度目标自 5.5-6.5 岁（r25 校准）
上移至 **6.5-8 岁**；r25（09-21）仅动 dch3/dch4，本轮把整条难度曲线重排前移
（CH_CFG 全换）。本文件为 SPEC-BATCH34 §0.82/§1/§4 的 r51 修订版，与
SPEC-R25 冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

玩法骨架（亮相→躲杯→换位→静止→点杯开杯）、教学链（tutWatchLevel/
tutTurnLevel 手工 2 杯 1 换关、SWAP_MS_TUT=1600、`__hcDemoR`/`__hcTutSolo`
证据链、flat0 watch→help→solo）、档键 kidsgame_hidecup、CH_LEN=5、
STATIC_LEVELS=20、生成关 dch=ri(rnd,1,4) seeded 随机、种子
mulberry32(flat×7919+311) 全不动。变化三件事：

- **章型表全换（曲线前移）**：ch1 起步即 3 杯 2 换（r25 的 2 杯 1 换退役）、
  ch2 4 杯 3 换、ch3 4 杯 4 换+**双动物腿升参至 c4s4**（r25 dual 是 c3s3）、
  ch4 4 杯 5 换+dual c4s5+**新题型 hidetriple c4s4**。换位速度四档
  900/800/700/600ms（r25 是 1100/1100/900/700；旧 SWAP_MS=1100 常量退役，
  SWAP_MS_D1-D4 四常量替位）。
- **hidetriple 新题型（三动物三问）**：三只动物各躲一杯、同串换位各自追踪、
  三步作答（详见 §R4）。零新语音键（§R6）。
- **m 批挂账收口**：m3（presentQuiz hide 分支 peek rAF 双层闭包补 token
  守卫——dual 分支 r25 已有，hide 分支漏网）本轮补齐；m4（verify ⑭
  swapDurCheck 取末次 swap 对的 wrap）r25 已收口，本轮沿袭并在 ⑭ 头注固化。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键全不动）

| 难度章 | 章名 | 每关 5 题构成 | 换位 ms | 判定点/关 |
| --- | --- | --- | --- | --- |
| 1 杯杯藏猫猫 | hide c=3 s=2 ×5 | 900 | 5 |
| 2 四个杯杯来啦 | hide c=4 s=3 ×5 | 800 | 5 |
| 3 两只一起藏 | 谱 KINDS3=qi0/2/4 hide c=4 s=4 + qi1/3 hidedual c=4 s=4 | 700 | 7 |
| 4 藏猫猫大挑战 | 谱 KINDS4=qi0/4 hide c=4 s=5 + qi1/3 hidedual c=4 s=5 + qi2 hidetriple c=4 s=4 | 600 | 9 |

- CH_CFG 全换：`{1:{c:3,s:2}, 2:{c:4,s:3}, 3:{c:4,s:4,dc:4,ds:4},
  4:{c:4,s:5,dc:4,ds:5,tc:4,ts:4}}`（c/s=hide 腿、dc/ds=双动物腿、tc/ts=
  三动物腿）。固定谱 `KINDS3=['hide','hidedual','hide','hidedual','hide']`、
  `KINDS4=['hide','hidedual','hidetriple','hidedual','hide']`（qi 位确定性
  替代掷币——r24/r25 同范式；r25 的 DUAL_KINDS 单谱名退役，双谱表替位）。
- swapMsOf 四档：`dch>=4?600:(dch===3?700:(dch===2?800:900))`；教学恒 1600
  （SWAP_MS_TUT 不动；tutTurn 猫猫题走 swapMsOf(0)=900——r25 时为 1100，
  turn 段换位 -200ms，教学 watch 分账 TUT_SUM=15334 不涉此值，零影响）。
- 换位追踪窗（每题换位总时长）：dch1=1800 / dch2=2400 / dch3=2800 /
  dch4 hide 腿=3000ms——追踪对象 3-4 只 + 窗口较 r25 前期大幅收窄。
- 章名/hint（家族契约 hint[i]↔CHAPTERS[i+1] 预告下一章，禁右移）：
  CHAPTERS[1] 名保留『杯杯藏猫猫』hint=『四个杯杯来啦，跟紧看』（预告 ch2
  四杯）；CHAPTERS[2] 名=『四个杯杯来啦』hint=『藏两只啦，各记各的』（预告
  ch3 双动物）；CHAPTERS[3] 名=『两只一起藏』hint=『三只小动物藏猫猫』（预告
  ch4 三只）；CHAPTERS[4] 不变。GEN_HINTS[0-3]=『三个杯子换两次/四个杯子换
  三次/四个杯子藏两只/四个杯子藏三只』（对应四档新参数）。
- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：每关 dch=ri(rnd,1,4) seeded
  随机（域全档成立型），r51 实测 flat20-39 分布 {1:3, 2:2, 3:10, 4:5} 四档全现。

## §R3 生成律（§0.82 r51 修订——四方同步红线 + Python 复算同构锚）

- 种子通道不变：mulberry32(flat×7919+311)，同 flat 永远同关。
- **取数时机（rnd 消耗序列逐位可复算——verify_batch34 Python 对拍同构锚，
  顺序写死如下）**：
  1. flat≥20 才消耗：`dch=ri(rnd,1,4)`（消耗 1）
  2. `anim=ANIMALS[floor(rnd()*5)]`（消耗 1，每关一主）
  3. **dch>=3 才消耗**：`anim2=ANIMALS[floor(rnd()*5)]`（消耗 1，双动物腿
     出场=ch3/ch4 谱含 hidedual）；同掷定值替换保 ≠anim（单次 +1 环取，不耗
     种子）。dch1/2 不取数（r25 是 dch4 才取——r51 前移）
  4. **dch===4 才消耗**：`anim3=ANIMALS[floor(rnd()*5)]`（消耗 1，三动物腿
     出场=KINDS4 含 hidetriple）；while 定值替换保 ∉{anim,anim2}（池 5 占 2
     必终止，不耗种子）。dch3 不取数
  5. 每题按 KINDS 表分腿（dch1/2 无谱表=全 hide）：
     - hide：`start=ri(0,c-1)`（1）+ genSwaps（s 次每次 1）
     - hidedual：`startA=ri(0,c-1)`（1）+ `startB=ri(0,c-2)`（1，压缩 +1
       避开 A 不耗重掷）+ genSwaps（s）
     - hidetriple：`startA=ri(0,c-1)`（1）+ `startB=ri(0,c-2)`（1）+
       `startC=rem[ri(0,c-3)]`（1，rem=[0,c)\{A,B} 恰 c-2=2 元双射——
       ri(0,1) 与 rem 下标域恰同域）+ genSwaps（s）
- **genSwaps(c=4,s=5) 禁假换可满足性（写前验算）**：c=4 有序对 12、排除同
  集合 prev 后异集合候选 10，非空恒可选；s=4/5 均无死锁。
- **triple 压缩采样互异域（写前验算）**：startA 值域 4、startB 压缩后值域
  [0,4)\{A} 恰 3、startC 经 rem 值域恰剩余 2——三随机数消耗、零重掷、
  三 start 恒互异。
- **permutation 双射恒推三答案互异（SPEC 论证）**：swaps 有限序列作用在
  位置集合上构成双射 π；answerX=π(startX)；startA/B/C 两两互异 + π 保
  不等性 ⇒ answerA/B/C 两两互异——判定面无重叠、豁免窗 guard 无歧义。
- quiz 字段：hidedual 增 anim2 域不变；hidetriple 增 `startA/startB/startC/
  answerA/answerB/answerC/animA/animB/animC/phase(0/1/2)`；兼容面
  start=startA/answer=当前步真值/anim=animA（旧断言面平滑）。`_miss` 三步
  共用（同一题重试与星级口径）。
- **四方口径同步**：game-core.js（buildQuiz/genLevel）/ game-verify.js
  （③⑧ SPEC 表独立对账+直驱+谱聚合+⑧ 取数时机复算）/ verify_batch34.py
  q_hidecup（主线 Python 独立复算，§R8 适配清单）/ build.py（结构锚）。

## §R4 hidetriple 三步流（复用 hidedual 两步流范式扩展）

- **开题（presentQuiz）**：亮相链 4 段 **[hc_n_A, hc_n_B, hc_n_C, hc_show]**
  （全 clip）；三只轮流探头（A 升 1.1s→缩 0.4s→B→缩→C→缩，错峰 PEEK_MS，
  peekTotal=(PEEK_MS+HIDE_MS)×3=**5700** 容纳于 SHOW_WIN_TRIPLE=7000）；
  q-text=『<A名>、<B名>和<C名>藏在哪里呀』；换位 600ms/次。渲染 hostOf 三
  动物各挂 start 杯随杯走。
- **三步作答**：phase 0/1/2。第一步点对（engTapCup 返回 **'half'**）：
  phase 0→1、q.answer=answerB；A 杯 found+确认链 **[hc_right, hc_n_A,
  hc_n_B]**（链尾名音预告第二问）；q-text 切『<B名>和<C名>藏在哪里呀』。
  第二步点对（'half'）：phase 1→2、q.answer=answerC；B 杯 found+确认链
  **[hc_right, hc_n_B, hc_n_C]**（链尾预告第三问）；q-text 切『<C名>藏在
  哪里呀』。第三步点对='right'/'done' 推进；确认链 [hc_right, hc_n_C]——
  末步名音=ansAnimOf(q) 按 kind 静态分流（hide=anim/dual=animB/
  triple=animC）。half 不推 step、不置 _answered、不入 retries（中间态非
  错误——r24 口径）；**每个 half 解锁处重置救援钟 lastAct=Date.now()**
  （r25 M2 铁律：部分正确中间态解锁不刷→后续步被答案级救援即刻泄题——
  triple 两个 half 解锁处同律）。HALF_WIN=5800 复用（各 half 3 段链
  2232+150+1440+150+1440+300=5712≤5800，窗推导不变）。
- **重演（doReplay）**：triple phase≥1 时重演开始移除已完成步的 found
  （phase1=[startA] / phase2=[startA,startB]，杯身份锚 data-cup 查找）——
  已开杯藏回完整重看；演毕恢复。恢复动作在 user=false 救援路径**不刷
  lastAct**（keepIdle 纪律；doReplay 完成段 `if(user) lastAct` 既有形态
  保持，verify ⑨ 源码锚防回归）。
- **救援**：答案级 breathe=correctIdx(q)=q.answer=**当前步**真值（phase
  感知自动适配，零分叉）；dual phase1 重演移除 A、triple phase1/2 移除
  A / A+B 同律。
- **星级口径**：triple 三步各 1 判定点（与 hide 单题同构）；'half' 不计
  miss；dch4 每关判定点=2×1+2×2+1×3=**9**（dch3=7、dch1/2=5）——
  autoSolve taps 口径=判对次数（'right'/'done'/'half' 均计）。
- **hidedual 升参**：ch3 c=4 s=4、ch4 c=4 s=5（r25 是 c3s3——双动物+顶格
  量域），两步流语义零变化。

## §R5 引擎与钩子（向后兼容）

- buildQuiz 签名扩 `(dch, qi, rnd, anim, anim2, anim3)`：kind=KINDS 表查位
  分三腿（hide/hidedual/hidetriple）。
- genLevel：anim2 在 dch>=3 取数、anim3 仅 dch===4 取数（§R3 定值替换律）。
- engTapCup：`(dual||triple)&&phase===0`→'half'（answer=answerB）；
  `triple&&phase===1`→'half'（answer=answerC）；余同 r25。
- structWhy：dual 位判定扩两章（dch3 KINDS3[qi]/dch4 KINDS4[qi]）；新
  triple 分支（仅 dch4 谱位：c=tc/s=ts/swap 形状/三 start 互异域/三答案
  derive 复算两两互异/三 anim 池封闭互异/phase=0/answer=answerA/init 干净）。
  关级谱构成断言在 game-verify ③ 聚合。
- HC 钩子：quiz getter 扩 triple 字段（startC/answerC/animC/phase 0-2）；
  autoSolve taps 计 'half'（每题至多 3 计）；tapCup 透传 'half'；
  window.__hcDemoR/__hcTutSolo/__hcPerm/__hcWatchMs 证据链零改动。
- 主逻辑：quizQText/pendingNames（q-text 按 phase 切剩余未找到动物名——
  单名『X藏在哪里呀』/多名顿号+和）；presentQuiz dual/triple 统一 peek
  编排（forEach 错峰 PEEK_MS，每只 up 带 token 守卫）；**m3 收口**：hide
  分支双层 rAF 闭包补 `if(token!==showRun||cur!==run) return;`（r25 漏网处）；
  half 分支统一 stepDone=q.phase 分流（1=A found+链[nA,nB] /
  2=B found+链[nB,nC]）；ansAnimOf 末步名音静态分流。
- 教学链/档键/日历/winFlow/celebrate/救援双锚结构零改动。

## §R6 语音键账（**零新增**——14 既有注入全不变照用）

| 维度 | 复用键 | 说明 |
| --- | --- | --- |
| triple 亮相链 | hc_n_A + hc_n_B + hc_n_C + hc_show（4 段既有） | 三名音连播=三动物预告 |
| triple 第一步确认链 | hc_right + hc_n_A + hc_n_B | 链尾名音=第二问预告 |
| triple 第二步确认链 | hc_right + hc_n_B + hc_n_C | 链尾名音=第三问预告 |
| triple 第三步确认链 | hc_right + hc_n_C | 末步名音=C（家族「末步名音=当前答案」口径） |

三名音互异（生成律保证）→ 链内无同键连播歧义。build.py clips 断言保持
子集式：14 必备键精确在册+总数 ≥14（r20-r25 范式）。新语音键清单：**空**。

## §R7 存档与兼容

**无档结构变化，无迁移 IIFE 需求**：档键 kidsgame_hidecup、levels 'ch-lv'、
CH_LEN=5、STATIC_LEVELS=20、日历语义、sv.hidecup.tutSeen 全不动；无新增
运行态子键（零新语音键→无一次性预告标记需求）。难度章内容变化（全章型
前移+triple 新题型）只影响未玩关的演出参数与生成内容（难度改造目的本身）；
已通关记录与新代码无矛盾态（r20-r25 同款声明——存档只记 stars/plays，
不含关内容指纹）。运行态新字段（phase/answerA/B/C/animA/B/C）每关由
genLevel 重建，不落存档。**教学关（2 杯 1 换 1600ms）与 r25 完全一致**——
已玩过教学的存档（tutSeen）在新版直接跳教学，行为无差。

## §R8 verify 适配清单（四层联动）

- **build.py（本轮已实施）**：r25 锚块全换 r51 锚（SWAP_MS_D1-D4 四常量/
  swapMsOf/SHOW_WIN_TRIPLE=7000/HALF_WIN 沿袭/CH_CFG 五形态字面/KINDS3/
  KINDS4 精确谱形/DUAL_KINDS 与 SWAP_MS=1100 禁式退役断言/engine 含
  'hidedual'+'hidetriple'+q.answer=q.answerB/q.answer=q.answerC+`if (dch >= 3)`
  anim2 取数锚+`if (dch === 4)` anim3 取数锚/main 含 swapMsOf(cur.dch)/
  'half'/两形态三段链字面/M1 锚/M2 锚/Math.round/setQText+藏在哪里呀/
  nameClip(ansAnimOf(q))/head 含 3 杯+4 杯 CSS 档）；窗推导断言 7000≥
  1440×3+150×3+1848+300=6918；**verify 拆独立第 4 script 块**（core/
  clips/game/verify 四块——原并入 script[2] 时 verify ⑨ 源码锚读自身所在
  块=自匹配恒真，b36 M1 家族缺陷，块数==4 硬断言防回并）；教学分账
  TUT_SUM 原样。
- **game-verify.js（本轮已实施，15→16 单元）**：SPEC_CH/SPEC_DUAL（章
  相关 {3:c4s4,4:c4s5}）/SPEC_TRIPLE/SPEC_KINDS3/SPEC_KINDS4/
  SPEC_CHAPTER_HINTS/SPEC_GEN_HINTS 独立重列；① sims 扩 flat0/5/10/15
  四档双视口；③ 对账分谱（triple 三 start 互异+三答案复算两两互异+三 anim
  互异）+谱聚合（dch3 恰 3hide+2dual / dch4 恰 2hide+2dual+1triple /
  dch1/2 恰 5hide）+直驱 triple 三步；⑧ 增 anim2/anim3 取数时机逐位复算
  （第 2/3/4 个随机数）；⑨ SHOW_WIN_TRIPLE ≥6918+swapMsOf 四档断言+
  srcR51 锚（answerC/anim3/hidetriple/两形态链/ansAnimOf）；⑫ flat0 形态
  改 cups=3/swaps=2；⑬ dual c=4 s=5；⑭ 四档 flat0/5/10/15 实读
  '108ms'/'96ms'/'84ms'/'72ms'（=900/800/700/600×0.12 精确整串）+
  swapDurCheck 取末次 swap 对（m4 已收口形态）；⑮ dual c=4 沿袭；
  **新 ⑯ triple 单元**（flat15 推进 qi2：形态+q-text 三名+亮相链 4 段+
  第一步 half 链[nA,nB]+q-text 切『B和C』+第二步 half 链[nB,nC]+q-text
  切『C』+B found+replay 重演毕 A/B found 恢复+第三步错点 A 已开杯 wrong+
  第三步对推进 qi3+末步名音=hc_n_C）。
- **_selftest.py（本轮已实施）**：MUTE 静音双保险沿袭；P2 flat5/flat10/
  flat15 三段（taps=5/7/9+开题时长实测断言，见 §R9）+flat15 存档
  levels['4-0'].stars==3；P3 真竖屏 800×1180 增 **flat1 3 杯档**（wrap
  132×172+触摸面 ≥96+overflowX≤0+截图）沿袭 flat15 4 杯档。
- **verify_batch34.py q_hidecup（主线职责，本文件声明适配清单不实施）**：
  ①章型域全换（SPEC_CH {1:c3s2,2:c4s3,3:c4s4,4:c4s5}+dual {3:c4s4,
  4:c4s5}+triple {4:c4s4}）；②dch3/dch4 谱分支（KINDS3/KINDS4 查位）；
  ③triple 三步驱动（tapCup(q.answer) 得 'half' → tapCup(q.answer) 得
  'half' → tapCup(q.answer)=right/done——q.answer 动态口径直读，与 dual
  两步同构）；④谱聚合改 {hide,hidedual,hidetriple}；⑤taps 期望改
  dch1/2=5、dch3=7、dch4=9；⑥anim2/anim3 取数时机对拍（§R3 序列）；
  ⑦WRONG_WAIT/LB 链窗不变（错链构成未动）；⑧gate_common34 G3 clips_n=14
  不变（零新键）。

## §R9 时序参数（推导+页内实测——r23 P2-1 红线：写实测方法与数值）

**推导值（名义）**：

| 窗 | 值 | 推导 |
| --- | --- | --- |
| SHOW_WIN_TRIPLE | 7000 | ≥ 名音 max 1440×3+150×3+hc_show 1848+300=**6918**（任务书原稿 6958 系笔误——1440×3=4320 非 4360，勘误定 6918；7000 余量 82） |
| HALF_WIN（沿袭） | 5800 | ≥ 2232+150+1440+150+1440+300=5712（dual 第一步与 triple 两个 half 通用——各 half 均为 3 段链） |
| peekTotal(triple) | 5700 | (PEEK_MS+HIDE_MS)×3=1900×3（r25 dual ×2=3800 同构外推；任务书原稿 5100 无法由该公式导出——纯串联 4.5s+余量亦容纳，实现取同构 5700，SPEC 勘误记录） |
| transition-duration | 108/96/84/72ms | 900/800/700/600×SPEED 0.12，Math.round 保整串（600×0.12=72 精确） |
| 开题总时长（SPEED=1） | dch1 hide=4300+2×900+800=6900 / dch2=4300+3×800+800=7500 / dch3 qi0=4300+4×700+800=7900 / dch4 qi0=4300+5×600+800=8100（+140 锁余量=7040/7640/8040/8240） | 各窗+换位+锁余量精确累加 |

**页内实测①（verify ⑭，SPEED=0.12）**：开题演出后实读末次 swap 对两只
wrap 的 style.transitionDuration，期望 '108ms'(dch1)/'96ms'(dch2)/
'84ms'(dch3)/'72ms'(dch4) 精确整串。r51 实测 16/16 通过。

**页内实测②（_selftest P2，真实页 SPEED=1）**：HC.start(flat) 至首题可交
互实测时长（r51 交付实测值）：
- flat5（dch2 qi0 hide c4s3）：**7658ms**（期望 **7640**=4300+3×800+800+140——r51-minor 勘正
  原笔误 7740（与 §R9 表 dch2=7640 自相矛盾处已对齐）；断言带宽 [6900,8800]——带宽上界拦不住
  dch2 错接 1100 档（8440<8800），该缺口判别力由 verify ⑭ swap 精确串（如 '96ms'）兜底）
- flat10（dch3 qi0 hide c4s4）：**8066ms**（期望 8040=4300+4×700+800+140；
  断言带宽 [7500,8840]——上界=(8040+1100 坏档 9640)/2，1100 旧档接错必 FAIL）
- flat15（dch4 qi0 hide c4s5）：**8258ms**（期望 8240=4300+5×600+800+140；
  断言带宽 [7700,9700]——1100 旧档=10740 必 FAIL）
- **相邻档（700 vs 600）精细判别不由开题时长承担**（档差仅 400ms×4-5 次
  =1600-2000ms 但机器抖动同量级）——由 verify ⑭ 精确串 72ms≠84ms 零抖动
  断言承担（变异 M1 实证：swapMsOf dch4 逻辑接 700 档 → verify 2 单元红）。
- triple 题（qi2）真实页开题窗 7000+4×600+800+140=10340ms 由 autoSolve
  全程端到端覆盖（flat15 taps=9 通过），verify ⑯（×0.12）单独断言其亮相
  链 4 段与三步流。

**可跟性风险**：600ms 快换+4 杯 5 换+三轨迹对部分 6.5 岁儿童可能偏难——
宁难勿易口径下接受，救援两级（14s 重演/30s breathe+重演）与重看按钮
（3s 节流）兜底；真机儿童数据回归时复盘（§R11）。

## §R10 验收数字口径（r51 交付门禁，数字如实）

①build 双跑 md5 一致（0e24d3f3ee06b54015378632d1e6c4da）②VERIFY 双视口
（1280×800+800×1180）**16/16** 双过+0 pageerror ③_selftest 全绿（MUTE/
P1 16 单元/P2 taps 5/5/7/9+开题实测 7658/8066/8258ms/P3 真竖屏 3 杯
132×172+4 杯 102×150）④verify_batch34 hidecup（主线按 §R8 适配后跑）
⑤gate G3 n=14（零新键，不变）⑥新语音键清单=**空** ⑦本文件 ⑧0 pageerror+
0 http 外联（build 离线断言）＋变异测试 5 例全红（M0/M3/M4 build 层拦、
M1 swapMsOf 逻辑错 verify ⑭⑨ 红、M2 startC 压缩拆除 verify ③ 红；测毕
文件还原 md5 回 golden）。

## §R11 风险与未验证项（如实）

- 600ms 快换+三轨迹对部分儿童偏难：宁难勿易口径下接受（§R9）；真机儿童
  数据回归时复盘。
- 3 杯竖屏档（132×172）为本轮新增 CSS：P3 真竖屏 800×1180 实测通过
  （wrap 132×172/触摸面 ≥96/overflowX=0），更窄真机（<460px 视口）未实测
  ——scene min(460px,96vw) 随视口收缩，slot 同步收窄，132 wrap 在 ~400px
  视口仍余（slot≈(0.96×400-28)/3≈118 <132 有溢出风险，待真机回归）。
- triple 第二步点错后豁免窗（5154 真时钟）内第三错被吞——与单/双动物口径
  一致（家族 I 补），无新增风险。
- 重演恢复 found 在救援路径（user=false）不刷 lastAct——源码级防回归锚在
  verify ⑨；行为级答案级 30s 可达性未做 105s 静置实测（r25 同款声明）。
- 主线 verify_batch34/gate 适配未实施（§R8 声明），Executor 自测不含其结论。
- swapMsOf(0)（教学 turn 关 dch=0）落 D1=900 档：教学 turn 段换位 1100→
  900ms（r51 曲线前移的自然结果），教学只教操作不承担难度、900ms 仍为
  可跟随慢速，watch 演示段恒 1600 不变；未单独做教学时序回归实测（P2
  教学链全程通过=行为级覆盖）。
