# SPEC-R24-SOUNDCOUNT · 听音计数难度加深增补（r24，2026-09-20）

依据：AUDIT-56 行33 黄款判定「听觉计数 1-5 有训练点，**视锚恒在不撤=自降难度**」实测 50-60s/关；
行98 建议方向「①ch4 起撤视锚纯听模式 ②量域 6-10 ③双音色双问」。
校准：b33 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）——r21 colormix/r22 share/r23 piano 同口径。
本文件为 SPEC-BATCH33 §0.79/§1/§4 的 r24 修订版，与其冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「播击段→问句→数字卡点选」玩法骨架与教学链（flat0 watch→帮→独、演示 3 下/turn 2 下、
`__scDemoR`/`__scTutSolo` 证据链零改动），消除「数鼓图闪跳即可绕过听觉」的自降难度通道：
三个新认知维度落 dch4（dch1/dch2/dch3 基线全不动）——

- **撤视锚纯听（核心，审计①）**：dch4 起（含生成关 dch4 腿）击段播放期鼓图**不再逐击
  bounce**（鼓图静态在场=身份图；播放期题面挂「用耳朵数」耳徽标，仅标志播放开始/结束、
  **零逐击信息**）。听觉计数从「可绕过」变「必经通道」。救援分层（方向级不给/答案级可给）：
  14s 方向级与用户重听（hearBtn/点题面/首错自动重播）**恒纯听**；30s 答案级在纯听关
  **例外给视锚**（正确卡 breathe + 带视锚重播——卡死 30s 的孩子最后看到一次「声音↔击跳」
  对应关系，承家族答案级「静音也能看见答案线索」先例）。
- **量域上探 6-10（审计②）**：dch4 counthear 腿 N∈[6,10]（候选域封闭 {6..10}，4 卡）。
  6-10 在 subitizing（即时目测 ~4-5）上限之外，听觉计数必须逐次累加——正是幼小衔接的
  计数训练点。数字卡 6-10 走**双行五点阵（十格阵 ten-frame 形）**：第一行恒 5 点+第二行
  n-5 点（6=「5 和 1」结构化表征，幼小衔接标准教具形态；1-5 单行原样）。
- **双音色双问（审计③，选型=一题两问两步作答）**：新题型 countdual——鼓 N 下+铃 M 下
  混排**只播一遍**，第一步问「鼓敲了几下」（复用 sc_q2）作答后再问「铃铛响了几下」
  （新 sc_q3）作答。孩子在听音期须**同时跟踪两个音色的计数**（双重选择性计数），
  第一步作答后仍须保住第二步答案（工作记忆保持）。两步共用同一组数字卡（候选 ⊆1-5
  恒含 N 与 M，N≠M 保证两步答案可区分）。
  - **选型理由（vs 混合域加深）**：混合域加深与维度②量域上探实质重叠（都是把现有题型
    域拉大）；一题两问是独立新维度（分音色双通道工作记忆），且其作答面（两步点卡）与
    现有点选同构、判定确定性可自证（每步答案=唯一真值卡），风险可控，故取双问。
  - **否决「两步间重播一遍」**：重播把双问拆成两个独立 countmix 题（第二步新听新数），
    记忆保持维度归零，宁难勿易口径下否决；孩子仍可自己点重听（3s 节流）自救。

维度不叠同题：counthear 大域腿=纯量域维；countdual=纯双问维（N∈[3,5]/M∈[2,4] 留在
1-5 域，负荷在工作记忆不在计数幅度）；全章共用纯听维。教学骨架（flat0 watch→help→solo）
零改动；档键 kidsgame_soundcount/CH_LEN=5/STATIC_LEVELS=20/难度章 (ch-1)%4+1 循环/
种子 mulberry32(flat×7919+733) 全不动；无迁移 IIFE。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键全不动）

| 难度章 | 章名 | 型 | 每关 5 题构成 | 新认知维度 |
| --- | --- | --- | --- | --- |
| 1 鼓声数一数（教学） | counthear | 原样（N∈[2,3] 2 候选，flat0 教学链不动） | 基线（原样保留） |
| 2 听得更仔细 | counthear | 原样（N∈[3,4] 3 候选） | 基线（原样保留） |
| 3 小铃来捣乱 | countmix | 原样（N∈[3,5]+M∈[1,2] 且 N+M≤6，4 候选；视锚恒在） | 基线（原样保留——选择性计数） |
| 4 大挑战 | **纯听+大域+双问** | 固定谱 qi0/2/4=counthear N∈[6,10]（候选 ⊆{6..10} 4 卡）+ qi1/3=countdual N∈[3,5]≠M∈[2,4]（候选 ⊆{1..5} 4 卡含 N 与 M）；**全章击段无逐击视锚** | 撤视锚纯听+量域 6-10+双音色双问 |

- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：ch5/9/..=dch1、ch6/10/..=dch2、
  ch7/11/..=dch3（countmix 原样）、ch8/12/..=dch4（纯听+大域+双问固定谱）。
- 旧 dch4「counthear N∈[2,5] / countmix 同 dch3 域逐题掷币混出」退役：两族混出的训练值
  由 countdual 承载（其 seq 本身即鼓铃混排、且双问把两族都问到——比旧混出更强的混出形态）；
  countmix 单独形态仍在 dch3（含生成关 dch3 腿）完整保留。难度改造目的即内容变化，已通关档
  无矛盾态（§R7）。
- 章末预告文案随 ch4 内容更新：CHAPTERS[3].hint（预告 ch4）='鼓不跳了，用耳朵数大数字'；
  GEN_HINTS[3]（dch4 生成关）='用耳朵数大数字'；CHAPTERS[1]/[2]/[4].hint 与 GEN_HINTS[0-2]
  原样。C7 对账口径（hint[i]↔CHAPTERS[i+1]）不变。

## §R3 生成律扩定（§0.79 r24 修订——四方同步红线）

- 种子通道不变：mulberry32(flat×7919+733)，同 flat 永远同关。
- dch1/dch2/dch3 生成律**逐字节原样**（buildQuiz 现行 counthear/countmix 分支不动）。
- dch4 固定题型谱（qi 即题位，替代旧掷币）：kinds = [counthear, countdual, counthear,
  countdual, counthear]（3 大域 + 2 双问，两形态每关恒在场——确定性保证，替代旧
  「逐题掷币+全同翻 1」聚合纪律）。
- counthear 大域腿（仅 dch4）：count=ri(6,10)；mix=0；seq 恒全 'd'；候选 = [count] +
  shuffled(NUMS_HI∖{count}).slice(0,3)，NUMS_HI=[6,7,8,9,10]（恰 4 卡 ⊆{6..10} 互异含真值，
  干扰全在大域带内=近失区间，防远距干扰送分）。
- countdual 腿（仅 dch4）：count=ri(3,5)（鼓）；mix=ri(2,4)（铃）且 **count≠mix**（两步
  答案可区分——同值则两步同卡退化；同掷值时**定值替换** count=3→mix4 / count=4→mix3 /
  count=5→mix2，不耗种子）；seq=count 个 'd' + mix 个 'b' 洗牌混排（音色间可
  相邻，count≥3/mix≥2 两族恒在场）；候选 = [count, mix] + shuffled({1..5}∖{count,mix})
  .slice(0,2)（恰 4 卡 ⊆{1..5} 互异**恒含两步真值**）。
- quiz 字段扩展：countdual 增 `phase`（0=问鼓/1=问铃，初始 0；phase 1 进入时 UI 重问句
  不重播击段）；`answer` 语义=**当前步真值卡下标**：counthear/countmix 恒 = count 卡下标
  （静态）；countdual = phase 0 → count 卡下标 / phase 1 → mix 卡下标（引擎按 phase 求值，
  SC.quiz getter 同口径）。`_miss` 双步累计（两步共用重试与星级口径）。
- **四方口径同步**：本节生成律必须 game-core.js（buildQuiz/genLevel）/ game-verify.js
  （①②SPEC 表独立对账+直驱分支）/ verify_batch33.py q_soundcount（主线 Python 独立复算——
  dch4 谱+countdual 两步驱动+候选域 {6..10}/{1..5} 双带）/ build.py（结构锚）四处同源
  同步，缺一即独立复验红。

## §R4 新机制（dch4 纯听播放 / countdual 两步作答 / 大域卡面）

- **纯听播放器**：`pureOf(L)=L.dch===4`（教学迷你关 flat<0 与 flat0-14 恒 false）。
  playBeats(q, anchored)：pure 且非 anchored 时——播放前 scene 挂 `.listening` 类（耳徽标
  显示，播完移除）、**鼓击不 bounce**（drumHit(anchor=false) 只计数+发声）、铃击照旧只
  发声；`__scBounceN` 语义不变（鼓击计数器，纯听下仍逐击累加——它是击序对账锚不是视锚
  锚）。anchored=true 仅 30s 答案级救援在纯听关传入（视锚回归一次）。
- **countdual 两步流**：presentQuiz 播击段（一遍）→ 问句 q2「鼓敲了几下」（窗口 2148 原样）
  → 开放点选。第一步点对（engTapOpt 返回 **'half'**）：卡亮+chime+确认链 [sc_right,
  sc_n_<count>]（窗 1600+3000 原样）→ **不重播**，askVoice 切 q3「铃铛响了几下」（新窗
  **2600**，推导见 §R8 ⑮）→ 开放第二步点选；第二步点对='right'/'done' 推进（确认链
  [sc_right, **sc_n_<mix>**]——末步名音=铃数）。任一步点错=wrong（miss+1 不换步可重选，
  首错自动重播照家族链 3630+重播+2148）。题面 data-phase="0/1"、phase 1 时鼓图降不透明度
  .45 / phase 0 时铃图降 .45（当下问谁谁满亮——pre-literate 可辨），q-text 随步切换。
- **救援两级适配**：14s 方向级=纯听重播（**不动 lastAct**——审查M1 r24 修复定版：doReplay 增
  keepIdle 参，方向级传 true=重播完成不刷 idle 锚，30s 答案级跨重播周期可达；用户主动重听/
  首错自动重播/答案级重播保留刷新，b25 M4 语义不变。修复前实现曾隐式刷新致答案级每 14s 清零
  永不可达——真实页静置 105s 实测坐实后修）；30s 答案级=正确卡 breathe
  （correctIdx 按 phase 取**当前步**真值卡）+ `doReplay(false, pureOf(cur))`——纯听关给
  视锚重播（分层：方向级不给/答案级可给）。教学帮（tut=help）不涉 dch4 零改动。
- **首次纯听模式预告**（每存档一次，sv.soundcount.earsSeen）：dch4 开题（presentQuiz）
  击段前播 sc_ears「这次呀，用小耳朵数一数」（新键）+ 等实长+300 余量窗（3192+300=3492，
  _clipdur33 实测回填——宁等勿叠，防语音压掉头几击；维护轮③=r24 审查 m4 收紧：原 estMs
  全字符口径 4395 每存档首次超等 ~1.2s）；verify 页 stub 存档无此键
  =每次 dch4 开题重触发（⑲ 断言口径——r21 revSeen/r22 ansSeen/r23 tease 同范式）。
- **星级口径公平性论证（r24 定版）**：countdual 两步各 1 个判定点（与 counthear 单题
  1 判定点同构）；'half' 不计 miss 不入 retries（中间态非错误）；wrong 同现行口径
  miss+1 入 L.retries。dch4 每关判定点数=3×1+2×2=7（dch1-3 恒 5），错误机会面增幅
  与新维度负荷匹配；分档边界 0=3★/1-2=2★/≥3=1★ 与永不 0 星全不动。纯 dch1-3 关行为
  与 r24 前完全一致（向后兼容）。
- **量域 6-10 卡面**：numSvg(n) n≥6 双行点阵——第一行恒 5 点、第二行 n-5 点（r=5.6/
  gap 16.5/行 y=87/102，圆点 class="dot" 语义不变——verify 点数对账 .dot 数==n 跨 1-10
  通用）；数字字形字号 62 原样（两位数 "10" 宽 ~68 <120 viewBox 可容）。卡尺寸/排布零
  变化（恒 4 卡 ≤ 现布局上限）。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- buildQuiz：counthear 分支按 dch 取域（dch1/2 原样；dch4=NUMS_HI 大域）；新 countdual
  分支（§R3 律）；countmix 分支原样（dch3 专用）。
- genLevel：dch4 分支改固定谱 kinds（旧掷币+全同翻 1 退役删除）；dch1/2/3 与生成关
  dch=ri(1,4) 通道原样。
- engTapOpt：真值判定按 kind 取期望（counthear/countmix=q.answer；countdual=按 phase 求
  当前步真值卡下标 ansIdxOf(q)）。对且 countdual phase 0 → `q.phase=1` 返回 **'half'**
  （不置 _answered 不推 step）；对且（非 dual 或 dual phase 1）→ 置 _answered 推 step，
  末题 'done' 余 'right'；错 → miss+1 返 'wrong'；null 语义原样。
- correctIdx(q)：countdual 按 phase 返回当前步真值卡下标（救援 breathe/教学帮指共用）；
  其余原样（=q.answer）。
- structWhy 扩（单题函数）：全局 count 域 1-10；counthear 分支 dch4N 改 [6,10] 且候选
  ⊆NUMS_HI；新 countdual 分支（kind=dual 仅 dch4、count∈[3,5]、mix∈[2,4]、count≠mix、
  seq 混排两族在场、4 卡 ⊆{1..5} 含 count 与 mix 双真值、answer=count 卡下标、phase=0
  初始）；countmix 分支原样且**仅 dch3**（dch4 出 countmix='dch4Kind'——旧 dch4 混出域
  断言退役）。**关级构成断言（dch4 恰 3 counthear+恰 2 countdual、qi 位对应）不在
  structWhy——在 game-verify ① 聚合单元。**
- engStars/engWon 不动（§R4 口径论证）。
- **SC 钩子**：quiz getter 增 `phase`（countdual 0/1，其余 0）、answer 改 ansIdxOf 口径
  （phase 感知——autoSolve/gate 直接受益零适配）；tapOpt 透传新返回值 'half'；autoSolve
  taps 口径改为**判对次数**（'right'/'done'/'half' 均计——dch4 关 taps=7，dch1-3 恒 5）；
  新增 verify 专用驱动 `SC._forceIdle(ms)`（置 lastAct/lastDir 回拨，VERIFY 页守卫）与
  `SC._rescueCore()`（直调救援核心体，绕 verify 静默门）——r23 登记项④「救援两级零自动
  断言」落地。window.__scDemoR/__scTutSolo/__scBounceN 证据链零改动。
- 主逻辑：pureOf/playBeats(anchored)/drumHit(anchor)/listening 徽标/maybeEarsIntro/
  uiTapOpt 'half' 分支/askVoice phase 分支（q3 窗 2600）/30s 救援 anchored 传参/
  rescueCore 抽取（rescueTick=VERIFY 门+rescueCore，行为等价——真实页 interval 调
  rescueTick 原样）。教学链/档键/日历/winFlow/celebrate 零改动。

## §R6 语音键账（13 既有注入全不变照用；新增 7 键上报主线 gen_clips 中央登记）

| key | text | 用途 |
| --- | --- | --- |
| sc_ears | 这次呀，用小耳朵数一数 | 纯听模式首次预告（每存档一次，dch4 首题击段前）（新） |
| sc_q3 | 铃铛响了几下 | countdual 第二步问句/该步救援重读（新；第一步复用 sc_q2 鼓敲了几下） |
| sc_n_6 … sc_n_10（5 条） | 六下/七下/八下/九下/十下 | 大域确认链名音（count 6-10 判对拼播 [sc_right, sc_n_N]）（新） |

既有 13 条（sc_ 通用 8+名音 5）+ core 3 全照用。NUM_TEXT 扩 6-10（契约 L 数字/量词映射表
覆盖**封闭全域 1-10**）。**注册前新键静默无声**（core TTS 通道已删，speak=静默 drop），
确认链尾段缺 clip=少一段名音、无 keyless 崩路径（queue 段恒 key 串）；**新键必须先注册后
交付**（r23 审查定案），games 恰 **['soundcount']**（sc_ 前缀本款独占无撞车，仍按 r22
红线声明限定数组）。build.py clips 断言改子集式：「16 必备键（sc 13+core 3）精确在册+
总数 ≥16」（主线注册 7 新键后 23 亦过，防注册前后断言漂移——r20-r23 范式）；game-verify ⑪
同步子集式；_selftest P2 同步 ≥16/≥13。注册后主线须复测 sc_q3/sc_ears/sc_n_6-10 实长入
_clipdur33 族并回填 verify SPEC_DUR（本文件 §R8 ⑮ 推导窗按最长口径已预留）。

## §R7 存档与迁移

**无档结构变化，无迁移 IIFE 需求**：档键 kidsgame_soundcount、levels 'ch-lv'、CH_LEN=5、
STATIC_LEVELS=20、日历语义、sv.soundcount.tutSeen 全不动。新增运行态子键
sv.soundcount.earsSeen（纯听预告一次性标记）：旧档无此键=falsy=首次进 dch4 再播一次
sc_ears，无害幂等（r21 revSeen/r22 ansSeen/r23 tease 同款声明）。难度章内容变化只影响
未玩关的生成内容（难度改造目的本身）；已通关记录与新代码无矛盾态（r20-r23 同款声明）。
运行态新字段（phase）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep 计数断言逐处同步）

- **build.py**：`n_clips == 16` → `>= 16`（子集式，§R6）+16 必备键清单不变精确；契约 L
  NUM_TEXT 片段元组 1-5 → **1-10**（六下..十下）；旧 `'2148 * SPEED'` 字面断言退役
  （r24 起问句窗由 `askWin(q)` 求值），改断言 `'? 2600 : 2148'` 双窗+`const askWin`；
  新增 r24 结构锚：data 含 `NUMS_HI`/`key: 'sc_q3'`/`key: 'sc_ears'`，engine 含
  `'countdual'`+同掷值定值替换式，main 含 `pureOf`/`'half'` 分支/末步名音三元
  （`q.kind === 'countdual' ? q.mix : q.count`）/`doReplay(false, pureOf(cur))`/
  `maybeEarsIntro`，head 含 `listen-badge`，verify 含 `SPEC_HI`/`'countdual'`/
  `rescueLvl`；教学分账 TUT_SUM 与全部既有窗断言原样。
- **game-verify.js**：头注①②型域描述同步（dch4=纯听+大域+双问谱）；SPEC 表增
  SPEC_HI=[6..10]/SPEC_NUM_TEXT 扩 1-10/SPEC_Q_TEXT 增 countdual 双步文案/新
  SPEC_CHAPTER_HINTS[3]+SPEC_GEN_HINTS[3]；①40 关对账 dch4 分支重写（qi0/2/4 counthear
  count∈[6,10] 候选 ⊆SPEC_HI 互异含真值 / qi1/3 countdual count∈[3,5]≠mix∈[2,4] 候选
  ⊆{1..5} 含双真值 / seq 对账 / countdual phase=0 初始）+直驱分支（countdual 先点鼓
  答案卡期 'half' 再点铃答案卡）+聚合改 dch4 谱构成（恰 3+2、qi 位对应）+genDch 四型
  全现原样；⑥ 帧内容增 flat15（4 卡 .dot==num 跨 6-10 双行/countdual 铃图显示/纯听
  counthear 铃图隐藏/q-text 按 kind）；⑬ srcL 改 NUM_TEXT 10 键全等对账+I 补豁免窗
  guard 断言改 phase 感知串（`i !== correctIdx(q)`——r24 实现修复配套：guard 若用静态
  q.answer 会吞掉 countdual 第二步的正确选）+新增 src 锚（'half' 分支/末步名音三元/
  pureOf/答案级带锚重播）；⑭ 新 hint 文案对账；⑮ 增 q3 窗断言
  `2600 ≥ ceil(len('铃铛响了几下')×(SPEC_DUR.sc_q2/5))+300=2518`（家族 clip 实测最长
  字率 q2=1848/5=369.6ms/字 推导；注册后以实长复测替换）+ estMs 口径原样；
  ⑪ clips `===16`→`>=16`（SPEC_DUR 初版 13 键实长子集；主线注册后实长回填扩 20 键全量校验——
  2026-09-20 已回填：ears 3192/q3 2016/n_6-10 1368-1440，SPEC_MAXNAME 1416→1440）；**新增三单元**——⑲ 纯听
  撤锚单元（flat15：播放期 .listening 在场+整题 drum-b 动画 0 次+__scBounceN==count
  （击计数在、视锚撤）+quiz.count≥6+候选 ⊆6-10+__voiceHist 含 sc_ears）、⑳ countdual
  两步单元（flat15 真实 UI：第一步 tapOpt(answer)='half'→phase=1/data-phase/q-text 切
  铃铛/第二步错卡 wrong miss=1 不换步/第二步对 'right' 推进+确认链尾=sc_n_<mix>）、
  ㉑ 救援两级单元（flat15：SC._forceIdle(15000)+_rescueCore → 纯听重播 bounce=0；
  SC._forceIdle(31000)+_rescueCore → 正确卡 breathe+带锚重播 bounce>0——分层实证）；
  total 58→**61**（新旧对照：原①40+③-⑱17 项=58；+⑲⑳㉑ 各 1）。
- **_selftest.py**：**补 MUTE 静音双保险**（r19 红线——本款原版缺：speechSynthesis no-op+
  Audio.play 派发 ended+种档 sound:false 全字段，两相页 goto 前挂 init_script，块体=任务书
  指定原文，键 kidsgame_soundcount）；P1 原样（total 动态读）；P2 clips 断言改子集式
  `n_clip>=16 and sc_keys>=13`（注册前后同过）；P2 新增 flat15 真实主流程块（SC.start(15)
  → autoSolve taps==7 done → 存档 levels['4-0'].stars==3 + sv.soundcount.earsSeen==true）
  ——真实页纯听/双问/大域端到端证据（r23 P2-1 教训：听觉参数须真实页实测，不止 verify
  提速页）。
- **verify_batch33.py q_soundcount（主线职责，本文件声明适配清单不实施）**：dch4 分支改
  新谱（counthear N∈[6,10] 候选 ⊆{6..10}；countdual 新 kind 两步驱动——wait_ready 后
  tapOpt(q.answer) 得 'half'，再 wait_ready 后 tapOpthase1 答案）；候选域断言按 kind 分带
  （counthear-dch4 ⊆{6..10}，countdual ⊆{1..5} 含双真值）；dch4 型聚合改 {counthear,
  countdual}；WRONG_WAIT/LB 链窗不变（错链构成未动）；gate_common33 G3 clips_n=16 由主线
  注册 7 键后传参 16→23。

## §R9 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×800+800×1180）全过 **61/61** ③_selftest 全绿
（含 MUTE/P2 flat15 taps=7）④verify_batch33 soundcount 全绿（主线，按 §R8 适配后）
⑤gate G3 n=16（注册前）/23（注册后，主线传参）⑥新语音 7 键上报（sc_ears/sc_q3/
sc_n_6-10，games=['soundcount']）⑦本文件 ⑧0 pageerror+0 http。

## §R10 风险与未验证项（如实）

- 新 7 键注册前**静默无声**：sc_ears 预告/sc_q3 第二问句/大域名音在注册前不可听——已按
  r23 定案「先注册后交付」上报清单，主线 gen_clips 注册后全链可听；窗口推导按最长口径
  预留（q3 窗 2600/ears 窗 estMs 4395——维护轮③已按注册后实长收紧为 3192+300=3492），
  注册后实测若超推导须回填调窗。
- dch4 单关时长预估：3 大域腿（6-10 击×700ms≈4.2-7s/题）+2 双问腿，估 60-80s/关（vs 审计
  基线 50-60s）——上探幅度与 r23 piano P3-1（+75%）同量级，真机儿童数据回归时复盘。
- `SC._forceIdle/_rescueCore` 为 verify 专用驱动（VERIFY 页守卫），真实页不可达——新增
  钩子面已在 §R5 声明，审查可核。
- 主线 verify_batch33/gate 适配未实施（§R8 声明），Executor 自测不含其结论。
