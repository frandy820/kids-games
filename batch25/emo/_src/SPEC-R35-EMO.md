# SPEC-R35-EMO · 情绪脸谱难度加深改造（r35，2026-09-21）

依据：AUDIT-67 段序 17 🟡 判定「实测~55s/关：**ch1 基本四情绪=3-4 岁概念；ch3 近情绪辨析够段**」；
建议三维度（ch1 起 6 情绪全池+近对干扰恒在 / 情境升双线索(行为+动机)）。校准：b25 段标称
6-7 岁幼小衔接，宁难勿易——r15-r34 同口径。本文件为 emo 的 r35 难度谱定稿；与
SPEC-BATCH25 §0.59/§2 旧文及 game-core.js 旧注释冲突处以本文件为准（r28-r34 同款声明）。

## §R0 摸底结论（改造前基线）

- 引擎：点表情脸单步判定（engTapFace right/wrong/done；wrong=miss+1 卡不灰可重选）；
  种子 mulberry32(flat×7919+13)；CH_LEN=**5**（5 题/关）、STATIC_LEVELS=**20**（4 章×5 关）、
  生成关 flat≥20 每关 dch=ri(1,4) 随机章参数。
- 章型（旧）：dch1 基本四情绪（BASIC4 目标+其余 3 基本互为干扰）/ dch2 六池随机 3 干扰 /
  dch3 近对辨析（目标∈4 近成员+近对必在）/ dch4 近标记混合（近≥2）。**flat 区间以款内
  CH_LEN=5 真值为准（r33 教训）**：静态 20 关=flat0-19，ch1=0-4/ch2=5-9/ch3=10-14/ch4=15-19。
- 谱生成通道：specSeqOf（题序）+buildQuiz（情境+干扰+洗牌）单一确定性通道，静态/生成同源。
- clips：manifest emo 段 **62 键在册**（基础 5 + emo_w_×6 + T46 emo_s_×24 + emo_cf_×24 +
  core_×3），mp3 全在盘——**T46 48 键已由主线预注册**，本轮按在册键接；voice/gen_clips.py
  并发轮主线独占**禁动**。
- 存档：kidsgame_emo（core VER 1.0，家族 C）；语音仅前 3 关（flat<3）不限救援/读题。
- 审计建议消化判断：维度一（全池+近对恒在）纯引擎改造照单承接；维度二（情境文案双线索）
  **须改 24 条 ask 文案 → 与在册 emo_s_*/emo_cf_* 48 键文本锁死冲突**（r34 M1：clip 文案与
  游戏内字符串严格一致）且 gen_clips 冻结——**裁量：以逆向题（情绪→情境）承接「行为+动机」
  双线索认知结构**（§R1 维度二论证），既有情境文案一字不动。
- **存量红（基线实测，非本轮引入）**：_selftest.py 24/26——#7 链断言（RIGHT_CHAIN_MS
  3500→6800 审查M2 提升后 3900ms 轮询腿未同步：DOM 未刷新期重复读题致 expect 列表翻倍）+
  #6 写档断言（celebrate→pass 写档 ~3.3s vs 读档 3.2s+轮询不足，stars10 偶发 None）。
  两腿本轮逐腿适配（§R8），适配前基线证据=本文件 §R0。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·全池+近对恒在（NEAR 扩三对，干扰规则统一）**：
- **NEAR 扩第三对 happy↔surprised**（原两对 sad↔worried、angry↔scared 保留为「硬对」）。
  理由：①审计「近对干扰恒在」对 6 情绪全域成立的前提=人人有伙伴，两对制下 happy/surprised
  目标题无对可放，恒在律破洞；②happy↔surprised 语义上天然可混（正面高唤醒），且在册情境
  文案已承载区分线索：**happy=愿望满足（收到想要的：礼物/冰淇淋/贴纸/荡秋千）vs
  surprised=出乎意料（没想到的：推门惊喜/一睁眼下雪/特别大的蛋/呼地飞出气球）**——与
  sad/worried、angry/scared 的文本线索铁律（完成态「了」/「怕·会不会·还没」/被冒犯/自身
  安危）同构，ch3 起辨析教学点成立；③三对全覆盖使「每题干扰必含近伙伴」成为全域单一规则
  （旧 dch1/dch2/dch3 三分支干扰规则统一为一条）。
- **每题（全部章、fwd/rev 全部）4 候选必含目标情绪的近伙伴**：fwd 候选情绪集 =
  {目标, NEAR[目标], 随机 2（∉{目标,伙伴}）}；rev 候选情境情绪集同构（§R1 维度二）。
- **ch1 目标池 = ALL6**（审计「ch1 起 6 情绪全池」照单；旧 BASIC4 四池互为通道退役）。
  ch1 唯一缓坡保留=全 fwd 题型+flat0 qi0 恒 happy（教学锚，§R2）。
- HARD4 = ['sad','worried','angry','scared']（两硬对成员）保留为 **ch3 目标域**——硬对
  文本线索铁律最严的域承载最难辨析（审计「ch3 近情绪辨析够段」=保留并升维）。

**维度二·逆向题 rev（情绪→情境，「行为+动机」双线索整合）**：
- 原建议「情境文案升双线索」不可行性见 §R0；承接方式=**题向反转**。正向题（fwd）=听情境
  行为线索 → 推情绪（行为→心理状态，单向）；逆向题（rev）=看大表情脸+听情绪词（动机/
  心理状态线索）→ 从 4 张情境图中选出引发它的那件事（心理状态→行为事件）。孩子须在
  4 候选间逐个做「这件事会让她产生这种情绪吗」的双向校验——情绪词（动机）与情境事件
  （行为）两线索同时在工作记忆中持有并匹配，即「行为+动机」双线索整合负荷；再认+反向
  提取双向构成完整概念网络（bidirectional retrieval，比单向再认深的提取练习）。
- UI：题面卡=大表情脸（faceSvg 复用，零新增资产）；候选=4 张情境场景图（sceneSvg 复用，
  2×2 网格，主答案卡 ≥96×96）；SVG 资产与 24 情境文案零改动。
- 语音：题面链 = queue([emo_w_<E>（在册）, {key:'emo_rev_q', text:'小兔子怎么了，选一选
  是哪件事'}（**已注册（2026-09-21 主线 manifest 5206）**；「注册前 TTS 兜底」为起草时误判——core Task#46 阶段3 删 speechSynthesis 后 speak=console.warn 静默无兜底播报，r35 审查 m-3 勘正）])；选对链 = queue([emo_w_<E>, emo_s_<场景情境句>]（**全在册**——与
  fwd 选对链 [emo_w_<E>, emo_cf_<确认句>] 同构：词先行+句确认，链长同域，RIGHT_CHAIN_MS
  =6800 复用不动）；错反馈=emo_wrong（在册，款语义不变）；hint=emo_hint（在册，文案
  「再看看发生了什么」对 rev 语义仍成立）。
- rev 候选生成：答案情境（emo=E）+ 近伙伴情境（emo=NEAR[E]，恒在——近对辨析在 rev 向
  同样成立）+ 随机 2 情绪情境（∉{E,NEAR[E]}，且槽位守卫 §R3）→ 4 候选情绪互异+情境互异。
- **rev 起点第 2 章**（非 ch1）：新题向叠加新干扰结构（近对恒在）不同章——ch1 只引入
  全池+近对，ch2 引入 rev（2/关），ch3 rev 主载（3/关+硬对域），ch4 双向混合。坡度：
  ch1 近对脸辨析（看脸）→ ch2 初见情境反向匹配（2 题/关，脸→图）→ ch3 硬对+rev 双满配
  → ch4 全域双向。

**维度三·章弧重排（生成关同构）**：§R2 表。

**教学链/星级/存档零改动**：tutorialWatch 看→帮→独原样（flat0 qi0 恒 {fwd, happy}——
post 谱机检锚）；retries 0/≤2/其他=3/2/1 星；档键 kidsgame_emo/sv.emo.tutSeen 不动。

## §R2 难度谱定稿（CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名 | 题型结构（每关 5 题） | 目标域 | 相对 r35 前 |
| --- | --- | --- | --- | --- |
| 1 | 心情脸（不变） | fwd×5 | ALL6 | 全池+近对恒在（原 BASIC4+四池互为干扰） |
| 2 | ~~六张脸~~→**哪件事** | shuffled([fwd,fwd,fwd,rev,rev]) | ALL6 | +rev×2（原全 fwd 随机干扰） |
| 3 | 像不像（不变） | shuffled([rev,rev,rev,fwd,fwd]) | HARD4 | rev 主载×3+硬对域（原 fwd 近辨析） |
| 4 | 大挑战（不变） | shuffled([fwd,fwd,rev,rev,coin])，coin=rnd()<0.5?fwd:rev → rev∈[2,3] | ALL6 | 双向混合（原近标记混合） |
| 生成 flat≥20 | — | dch=ri(1,4) 后同上同构 | 同上 | 同通道 |

- 目标序列供给：dch1/2/4=**shuffled(ALL6).slice(0,5)**（每情绪 ≤1 次/关，全互异）；flat0
  特例=['happy'].concat(shuffled(ALL6.filter(x≠'happy')).slice(0,4))（锚+互异）；
  dch3=shuffled(HARD4).concat([a[ri(0,2)]])（a=洗牌结果，第 5 题从前 3 取——保证 ≠第 4 题
  的相邻互异+每情绪 ≤2 次/关）。旧 pickDiff 相邻重掷通道退役（新供给律天然相邻互异——
  dch3 尾题取 a[0..2] ≠ a[3]=第 4 题 ✓）。
- 章名/章末预告/GEN_HINTS 改写（谱变更显式声明，r31 范式；⑬ 联动 §R8）：
  - CHAPTERS[1].hint（预告 ch2）= '还要想一想，是发生了哪件事'
  - CHAPTERS[2].name='哪件事'；CHAPTERS[2].hint（预告 ch3）= '像的心情碰上像的事，仔细挑一挑'
  - CHAPTERS[3].hint（预告 ch4）= '正着猜反着猜，大挑战来啦'
  - CHAPTERS[4].hint='新一轮心情猜猜挑战'（不变）；CHAPTERS[1]/[3]/[4].name 不变
  - GEN_HINTS[0]='六种心情都认识，像不像的要看清'（dch1 全池+近对）
  - GEN_HINTS[1]='想一想，是发生了哪件事'（dch2 rev）
  - GEN_HINTS[2]='像的心情配对事，仔细挑'（dch3 硬对+rev）
  - GEN_HINTS[3]='正着反着都能猜，想好再选'（dch4 混合）
  - 朗读卫生检查：逐条无叠字/无语病（r34 M1 口径）。
- **锚点（结构性，机检）**：flat0 qi0 = {mode:'fwd', emo:'happy'}（教学链零改动机检前提
  ——post 谱投影断言）；CH_LEN=5、STATIC_LEVELS=20、种子 mulberry32(flat×7919+13)、
  星级/存档语义全不动。

## §R3 生成律（确定性通道不变；verify/pycheck/extract 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)。genLevel：flat≥20 先 dch=ri(1,4)（恰 1 rnd，
  先取数保确定性）；specSeqOf→逐题 buildQuiz。
- **specSeqOf rnd 消耗（实现序，pycheck 逐位对拍）**：
  - dch1：flat0 → shuffled(ALL6\\{happy})（5 元素=4 rnd）取前 4 拼 ['happy',...]；
    非 flat0 → shuffled(ALL6)（5 rnd）。mode 全 'fwd'。
  - dch2：modes=shuffled(['fwd','fwd','fwd','rev','rev'])（4 rnd）；emos=shuffled(ALL6)（5 rnd）。
  - dch3：modes=shuffled(['rev','rev','rev','fwd','fwd'])（4 rnd）；a=shuffled(HARD4)
    （3 rnd）；tail=a[ri(0,2)]（1 rnd）；emos=a.concat([tail])。
  - dch4：modes=shuffled(['fwd','fwd','rev','rev', coin])（4 rnd+coin 1 rnd，coin 消耗在
    shuffled 之前：先掷币后洗牌 5 元素）；emos=shuffled(ALL6)（5 rnd）。
  - emo 与 mode 的配对=同下标 zip（seq[qi]={emo, mode}）。
- **buildQuiz rnd 消耗（每题，实现序）**：
  - 情境供给 takeScene(emo)：本关惰性池 pools[emo]（首次=shuffled(SCENES.filter(emo))
    （4 元素=3 rnd）），shift 取；**槽位守卫**：rev 随机候选情绪仅从 levelSlots[emo]<4
    的池取（构造性防情境池耗尽，见下）；pools 空时兜底 reshuffle 全池（理论不可达，声明）。
  - fwd（mode='fwd'）：scene=takeScene(E)；干扰情绪=shuffled(ALL6.filter(x∉{E,NEAR[E]})
    （4 元素=3 rnd）.slice(0,2)；faces=shuffled([{E},{NEAR[E],d1,d2} 情绪集])（4 元素=3 rnd）。
  - rev（mode='rev'）：answerScene=takeScene(E)；candEmos=[NEAR[E]] + shuffled(ALL6.
    filter(x∉{E,NEAR[E]} 且 levelSlots[x]<4))（3 rnd）.slice(0,2)；逐情绪 takeScene 取
    情境（顺序=伙伴→r1→r2，每情绪首次 3 rnd）；faces=shuffled(4 候选对象)（3 rnd）。
  - face 对象：fwd={id:'f'+j, emo, scene:null, right:(emo===q.emo)}；
    rev={id:'f'+j, emo:候选情绪, scene:候选情境, right:(scene===q.scene)}。
  - **槽位预算构造性论证**（r30 教训②值域可达性）：情绪 E 单关槽位上界=目标(≤2，dch1/2/4
    恒 1=全互异供给；dch3 ≤2=尾题律)+近伙伴出现(=NEAR[E] 作目标的题数，同受目标供给律
    ≤2)+随机候选(取时守卫 slots<4)→ 上界 4=情境池容量（每情绪 4 情境），同关情境互异
    恒成立（seenScenes 检查保留）；dch3 总需求 3×4+2=14 ≤ 4 情绪×4 槽=16 ✓。
- **structWhy 重写**（从本 SPEC 推导）：emo∈EMOS/scene∈SCENES 且映射唯一/锚=flat0&&qi0→
  {emo:'happy',mode:'fwd'}/dch3→emo∈HARD4/faces 4 互异/恰 1 right 且 right 与 q.emo(fwd)
  或 q.scene(rev) 一致/**近伙伴恒在场**/rev→face.scene 互异且每 face 情境映射情绪=face.emo/
  同关情境互异（fwd 目标+rev 全候选同一 seenScenes）/相邻情绪互异/初始态干净。
  旧分支退役：dch1emo/dch1basic/dch3pool/dch3near（被全池律+全域近对律取代）、quiz.near
  字段退役（谱全刷新已声明，四层联动清单 §R8）。
- **分布护栏（§R9 实测复核）**：dch1 目标全 6 池（5 题 5 情绪互异）；dch2 rev=2/关；
  dch3 目标∈HARD4+rev=3/关；dch4 rev∈[2,3]；40 关每题近伙伴在场；生成关四型全现；
  情境覆盖：全 40 关情境出现数 ≥20（池 24）。
- **rnd 流影响面（40 关全刷新=设计意图，非回归）**：specSeqOf/buildQuiz 消耗流全部重排
  → flats 0-39 全刷新（含 flat0 qi1-4；qi0 锚不变）。谱保留面=结构性（§R6）。

## §R4 交互·门族·救援·时序面（r23-r34 教训逐项回应）

- **门族一致性（r34 F1：hearBtn 漏 demo 门——本轮全按钮清单对齐）**：
  | 入口 | 改前门 | 改后门 |
  | --- | --- | --- |
  | rabbitBtn | VERIFY+!cur 外围；locked/demo/won 三件门（先 hop 后查门，hop=视觉反馈不泄内容，保留） | 不变 |
  | replayBtn | VERIFY/!cur/locked/**demo**/won 四门 | 不变 |
  | hearBtn | VERIFY/!cur/locked（**缺 demo+won**——r34 F1 同族漏门） | **补 demo+won 四门对齐** |
  | sceneEl（题面卡点按重听） | VERIFY/!cur/locked/demo（**缺 won**） | **补 won**（won 期 celebrate 覆盖层常在，防御性补齐） |
  | boardEl 卡 | 走 uiTapFace 自带门（locked/demo/won+非法态） | 不变（rev 情境卡同路径） |
  | stage 空白 | VERIFY/!cur+locked/won/demo 三门+10s 节流 | 不变 |
- **重入矩阵（r30）**：rev 走同一 uiTapFace 单步路径，无新演出窗。错窗 1000ms locked+
  cur!==run 身份守卫（现状保留）；对链窗 6800ms locked+身份守卫（现状保留）；rev 题的
  renderQuiz 换题在链窗 await 后同步执行（同 fwd）。**新增演出窗=零**。
- **时序面清单（r31/r34：SPEC 值=实现值逐调用点）**——改造后全量 setTimeout/timer/await：
  | 调用点 | 值 | 状态 |
  | --- | --- | --- |
  | qTimer（turn→题面接力） | 2600ms | 不变 |
  | tutorialWatch await | 700/2900/320/1300 ×SPEED | 不变 |
  | pointGhostAt setTimeout | 800×SPEED | 不变 |
  | winFlow celebrate.then await | 700ms | 不变 |
  | winFlow chapterEnd/dayEnd setTimeout(proceed) | 3400ms×2 | 不变 |
  | uiTapFace wrong await | WRONG_WIN_MS=1000×SPEED | 不变 |
  | uiTapFace right/done await | RIGHT_CHAIN_MS=6800×SPEED（fwd/rev 同窗） | 不变 |
  | 看护 setInterval | 1000ms | 不变 |
  | rev 题面链/选对链 | 无等待窗（fire-and-forget 播报） | **零新增** |
- **多步状态机（r25 M2）**：rev/fwd 均单判定点单步推进，无「第一步对」中间态——不适用
  论证同 r33 §R4。
- **救援（r24 M1 语义逐一声明）**：14s 方向级=speakQuiz 重读题面（fwd=情境句 clip；rev=
  [emo_w_E+emo_rev_q] 链——emo_rev_q 注册前 TTS 兜底播报，语义等价）+sceneEl pulse
  （rev 时 sceneEl=大表情脸卡，同一元素 pulse）——**不动 lastAct**（30s 答案级不被饿死，
  现状保留）；30s 答案级=正确卡 breathe（rev=正确情境卡）+重读题面——**刷 lastAct**（现状
  保留）；重听类（hearBtn/sceneEl）刷 lastAct ✓；兔兔**刷** lastAct（rabbitBtn 门通过后 lastAct=Date.now()；r35 审查 m-2 勘正——主动交互刷钟符合 r24 家族语义，原写「不刷」失实）/空白轻提示不刷 ✓。help 5s 重演示不变
  （rev 题 pointHelpNext 指向正确情境卡——correctIdx 通用）。
- **教学链零改动**：flat0 qi0 恒 fwd happy（锚），watch 演示链 [emo_w_happy, emo_cf_场景]
  不变（flat0 全 fwd）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：specSeqOf/buildQuiz/structWhy 重写（§R3）；**engTapFace/engWon/engStars/
  correctIdx/mulberry32/shuffled/ri/chOfFlat/diffOfCh 逐行不动**（判定面零改动——rev 的
  right 旗标语义与 fwd 同构，correctIdx 通用）。
- game-data.js：EMOS/SCENES/ask/cue/BG/ELEMENTS/faceSvg/sceneSvg/ICONS 零改动；NEAR 扩
  happy↔surprised+HARD4 常量；CHAPTERS[2].name+3 hint+GEN_HINTS 4 条改写；VOICE 增
  rev:{key:'emo_rev_q',text:...}；RIGHT_CHAIN_MS/WRONG_WIN_MS 不动。
- game-main.js：renderScene 增 rev 分支（大表情脸+aria）；renderBoard 增 rev 分支（2×2
  情境卡+dataset.scene）；speakQuiz 增 rev 链；uiTapFace 选对链增 rev 分支（emo_s_）；
  hearBtn/sceneEl 门补齐（§R4）；EM.quiz getter faces 增 scene 字段+mode 字段；其余
  （winFlow/proceed/startLevel/教学链/看护循环/底栏）零改动。
- **EM 钩子契约（扩字段，向后兼容）**：EM.currentLevel 增 n 不变；EM.quiz =
  { scene, emo, mode:'fwd'|'rev', faces[]{id,emo,scene}（fwd scene=null）, step, miss }——
  right 不入钩子（SPEC §2 契约保留：正确性=f.emo===quiz.emo（fwd）/f.scene===quiz.scene
  （rev））；tapFace(i)/start/autoSolve 原样（autoSolve 点 correctIdx 通吃两向）。

## §R6 基线证据（双证据+谱变更显式声明；工具随款归档 _src/）

- 改造前 index.html md5 **560a71ba327a9afb8c0f02aa70c93c5c**（3726747 chars 级单文件）；
  40 关谱提取 r35-baseline.json（_r35_extract.py，投影 [mode,emo,scene,faces[emo,scene,
  right]]——baseline 旧谱无 mode 字段投影 null，防假差异 r31 同口径）；改后 r35-post.json。
- 改造后 index.html md5 **6a822f441b63dfe174ccc8c5970ecab7**（1,758,780 bytes / 1,741,040
  chars，双跑幂等；62 clips 过程快照）。**终态（r35 审查 m-5 回填）：主线注册 emo_rev_q+修复轮后以收官行 md5 为准（见 ledger）。**基线→post 尺寸降幅来自 clips 注入层（同 62 键全在场=verify⑪/gate G3
  实证；主线 manifest 侧重编码所致），非游戏 JS 层删减（游戏 JS 净增：rev 题型/断言）。
- 保留（结构性，机检）：flat0 qi0={mode fwd,emo happy}（锚）；CH_LEN=5、200 题、40 关
  确定性双跑一致。
- 变更（预期=设计意图）：**40/40 关全刷新**（§R3 影响面）——刷新面以投影逐关 diff 计数
  披露（§R9）。
- 证据②（Python 独立复算）：_r35_pycheck.py 按 §R3 生成律 Python 独立实现 genLevel
  （mulberry32/shuffled/ri 同源副本+takScene 槽位守卫），与页内提取 r35-post-full.json
  全字段对拍 40/40。
- 存量红基线（§R0）：_selftest.py 改前 24/26（两项与谱无关的时序腿，§R8 适配）。

## §R7 语音（新键 TODO 清单——主线 gen_clips 统一注册，本轮禁自注册）

| 键 | 文案 | 用途 | 状态 |
| --- | --- | --- | --- |
| emo_rev_q | 小兔子怎么了，选一选是哪件事 | rev 题面链第二段（首段 emo_w_<E> 在册） | **TODO**（注册前 TTS 兜底；注册后 manifest 5190→5191、emo 段 62→63） |

- 选对链（rev）= [emo_w_<E>, emo_s_<scene>] 全在册；错反馈/hint/教学链全在册零新增。
- 注册后联动（主线执行，本轮 SPEC 预声明）：build.py n_clips 断言 62→**63**+EMO_KEYS 增
  'emo_rev_q'；game-verify.js ⑪ keys.length===62→**63**+need 增 emo_rev_q；gate_common25
  G3 NCLIPS 62→**63**。**本轮构建的 index.html clips 数=62（按现状写断言）。终态=63（主线注册 emo_rev_q+build/verify/gate 三处联动后；m-5 回填）。**

## §R8 计数断言四层联动清单（改动前 grep `== N` 全量清点；r18/r34 存量假挂坑）

| 层 | 改动点 |
| --- | --- |
| build.py | n_clips==62 **不动**（§R7 注册后口径 63 预声明）；新增契约断言：main 含 `'emo_rev_q'`+data 含 `HARD4`+data 含 `NEAR` 三对值 `'happy: 'surprised'`；RIGHT_CHAIN_MS 6800/WRONG_WIN_MS 1000 断言保留 |
| game-verify.js | ① 40 关审计（structWhy 新谱+drive 不变）；② SPEC_NEAR 扩 3 对+全题近伙伴恒在断言（原 dch1basic 分支删）+rev 情境互异/映射断言；③ 近对专项改 flat0-4 全题三对在场（原 flat10-14）；④-⑧ 不变（⑧ flat10=dch3 rev 主载仍适用）；⑨ 分布聚合重写（dch1 全池互异/dch2 rev=2/dch3 目标∈HARD4+rev=3/dch4 rev∈[2,3]/生成四型全现）；⑩ 布局 sims 增 flat10 rev 双视口+rev 卡 ≥96 断言；⑪ 62 不动（注册后 63）；⑬ hint 关键词按 §R2 新文案重写；**新增 ⑯ rev 语义单元**（quiz.mode/faces.scene/题面 DOM=大脸+4 情境卡/tap wrong-right 推进/换题重置）；⑭⑫⑮ 不变。总单元数 54→**55**（⑯）+⑩ 内扩不增 total——实跑以 title 为准 |
| _selftest.py | #2 PY_NEAR 扩 3 对+全题近对恒在+rev 断言+ch1 BASIC4 检查删（旧 L110-113 分支）+L116 `dch3 near_cnt==5` 改 mode 断言+L118 `dch4 near<2` 改 rev≥2；#3 faces 契约 {id,emo}→{id,emo,scene}+mode；#4 布局腿增 flat10；#6/#7 存量红适配（DOM 同步等待替代固定 3900 等待+写档轮询替代固定 3200）；**MUTE 双保险补齐**（r19：现有 selftest 无 MUTE init script——本轮补 MUTE_INIT ctx 级+种档 settings sound/tts/vol，batch6/words/_src 范式）；**截图腿竞态修复**（goto 后等 title=VERIFY 再 EM.start——旧版 300ms 固定等待与 runVerify 异步单元竞态致截图标错 flat；+截图前折叠 #verify-result 浮层取证净化——均测试侧，§R9） |
| verify_one_emo.py | 归档适配版 _src/_r35_verify_one_adapted.py：T1 `dch==1 and emo not in BASIC4` 删（改全池+近对恒在断言）；T3 `dch==3` 近对扩全关恒在+3 对；faces 契约含 scene；T4/T5/T6/T8/T10/T11 不变 |

## §R9 自测门禁实测数字（agent 实跑；主线独立复验）

| 门禁 | 实测 |
| --- | --- |
| build 双跑幂等 | md5 **6a822f441b63dfe174ccc8c5970ecab7** 两跑一致（1,741,040 chars） |
| VERIFY（?verify=1） | **55/55** 双视口（1280×800 + 800×1180）title='VERIFY PASS 55/55'，各 0 pageerror |
| _selftest.py | **30/30**（基线 24/26 存量红两腿修复§R0；MUTE 双保险=MUTE_INIT+种档 settings 全关） |
| verify_one 适配版 | **11/11**（_src/_r35_verify_one_adapted.py 归档） |
| 谱对照 | baseline→post **40/40 全刷新**+锚机检（flat0 q0={fwd,happy,scene h_icecream}）；情境覆盖 24/24 |
| 谱 pycheck | **40/40 identical**（_r35_pycheck.py Python 独立复算 vs r35-post-full.json 全字段） |
| gate_common25 emo | **3/3**（G1 verify 55/55 复跑 / G2 教学链+通关+写档 stars=3 / G3 clips n=62 全注入） |
| rev 布局取证（追加） | DOM 实测 4 卡全在 1280×800 视口内（2×2：y 312/462 行，各 311×136，scrollH=800=clientH 无滚动）+ 位图几何证明（4 卡区 sd 39-42/chroma 21-34=彩色插画在场、题面大脸区中心 14/21 肤色像素、行间带灰度 246=底色无重叠） |

_selftest 截图腿两处**测试侧**修复（不改游戏/不改谱）：①竞态——goto 后等 title 变 VERIFY
再 EM.start（旧版固定 300ms 会与页内 runVerify 异步单元竞态，截图标错 flat）；②取证净化
——截图前折叠 #verify-result 浮层（fixed top:0 max-height:60vh，body.verify 时显示，会遮
题面取证；游戏正常运行页无此元素）。VLM 读图服务按 CDN 路径缓存旧图三次误报「JSON 遮
挡/仅 2 卡」，以上 DOM 实测+像素对照（隐藏版与交付截图 diff=0.0000，显示/隐藏差 0.1492
集中在 60vh 浮层带）为地面真值。

## §R10 风险与登记项

- emo_rev_q 注册前 rev 题面链第二段走 TTS 兜底（音色与 clip 族有差）——主线注册后消失；
  注册前 _selftest 正常模式腿听感不断言（只断言链结构）。
- rev 情境卡 2×2 网格在 800×1180 竖屏的 SVG 细节可读性=真机观察项（§R9 截图留证）。
- 旧 quiz.near 字段退役：外部若有消费 near 的脚本（无——grep 款内仅 verify/selftest 已
  联动；ledger 谱无存档该字段——存档只有 levels/stars/plays）。
- _selftest 存量红两腿适配=测试侧修复，不改玩法谱（基线证据 §R0/§R6）。
