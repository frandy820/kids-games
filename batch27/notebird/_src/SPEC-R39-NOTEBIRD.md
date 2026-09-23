# SPEC-R39-NOTEBIRD · 音阶小鸟难度加深改造（r39，2026-09-21；r39-bis 修复轮 2026-09-22——§R8.1/§R13）

依据：AUDIT-67 notebird 🟡 判定「会话1410s：**ch2 后被位置映射策略绕过音频；
ch3 相邻音程辨析合格**」；建议三维度（ch2 起乱序站位破位置查表 / 加 3 音旋律
跟唱复现 / ch4 音程大小判断）。校准：b27 段标称 6-7 岁宁难勿易——r15-r38 同口径。
本文件为 notebird 的 r39 难度谱定稿；与 game-core.js/game-data.js 旧注释/
SPEC-BATCH27 §0.66/§3 冲突处以本文件为准（r28-r38 同款声明）。SPEC-BATCH27
§0.66「站位左低右高按音序」由本文件显式废止（ch1 有序 / ch2+ 乱序新谱）。

## §R0 目标

保留玩法框架（天空斜电线题面+合成鸟音+点选单步判定+教学看→帮→独+14s/30s 双锚
救援+星级+存档 kidsgame_notebird），根除「音频被视觉/位置绕过」——改造后：
ch2 起站位乱序+唱窗零视觉指认（**破位置查表+堵动画泄答**，双管）、ch4 新增
**melody 3 音旋律复现**（序列工作记忆）与 **interval 音程大小判断**（音程定量
辨析）。验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R10 TODO 9 键）；
计数断言改前 grep 全款 `== N` 四层联动清点（§R8）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·ch2 起乱序站位（主承重，承接+扩展）**：
- 承接：dch≥2（ch2/ch3/ch4+生成关同 dch）鸟站位**洗牌且强制非完全升序**
  （洗牌碰巧全升序 1/24 → 首两位对调兜底，0 rnd 消耗）。破「位置↔音高」
  查表：原版 4 鸟按音序左低右高，孩子听粗辨相对高度即可按位置猜（find），
  higher 更有「后唱的=右边的」双泄（低先高后+位置右高）——审计称 ch3 音程
  辨析合格=题型设计合格，乱序后辨析更纯（方向只能靠听），正是「强化」。
- **扩展①（审计未点名，同族更直接的绕过面）**：find 题唱窗 singing 动画
  **答案泄露修复**——原版 renderQuiz→flashSang 让 sang 鸟（find=答案鸟）飘
  ♪，孩子看动画即答，音频整条被绕过。新律：**唱窗内零视觉指认**——find/
  melody 唱窗不亮任何鸟；higher 保留两鸟先后亮（「哪两只在唱」是题面信息，
  高者才是答案，不泄；乱序后亮的两只也无位置线索）。
- **扩展②**：站台高度 ch1 递增（30+16i，教学建立「高音高站台」映射）→
  dch≥2 **等高 30px**（高度轴同步去线索，防左右轴破了换高度轴查表；30px 基数
  容 21px 唱名标签防截断——VLM 截图实证 14px 基线存量下半裁切，r39 顺手修）。
- 联动：find 错反馈方向句 not_g_right/left（「往右/往左找」位置语义）在
  乱序场为错误陈述→换音序语义新键 not_g_hi2/not_g_lo2；higher 错反馈
  not_g_higher（「左边的声音低右边高」位置语义）→not_g_h2（时序语义，
  乱序下恒真）。ch1 点错=free 不走链（不涉及）。
- ch1（dch1 含生成关）保持有序+递增站台+free 教学特例零改动（教学链锚）。

**维度二·3 音旋律跟唱复现 melody（承接，形态=点鸟复现序列）**：
- 定义：题面唱 **3 音互异序列**（sang=[a,b,c]，取自场上 4 鸟=序列 3 音+1
  干扰鸟），唱窗 3×700+2×300=2700ms（合成音窗不折算）；唱完开点选，孩子
  **依序点 3 只鸟复现**。逐点即判（r25 M2 口径）：点对当前位=鸟 picked 亮+
  播该音（「跟唱」）+progress+1（'step' 返回，700ms 锁窗唱完）；点错=wrong
  （miss+1+1000ms 防重入窗，**进度保留**错窗后从当前位续点）；3 位全对=
  right。不卡死（错窗过后恒可续点）/不双计（progress 只在点对推进）。
- 出题位：仅 dch4（含生成关 dch4）每关恒 1 题。旋律=听辨（ch2 技能）+序列
  记忆（新负荷）+唱名定位（乱序场），综合应用章坡度自然（b10 simon 序列
  2→4 为绿款合格先例）。

**维度三·ch4 音程大小判断 interval（承接，三分类防 50% 蒙）**：
- 定义：题面唱一对音（sang=[lo,hi]，d=hi-lo∈{1..7}），孩子答音程远近
  **三分类**：d=1 挨着 / d=2 隔一个 / d≥3 隔好几个。三文字卡点选（蒙对
  1/3，低于二选的 1/2——「离得近还是远」二分被否）。判定与鸟卡同构
  （卡 id 空间=类目 id iv_near/iv_mid/iv_far，engTapBird 零改动面——
  r36 sign act 卡同路径先例）。
- 出题位：仅 dch4（含生成关 dch4）每关恒 1 题。音程定量（超出 ch3「谁高」
  的方向判断，升维到距离判断）。
- 类目均衡：三分类各 1/3 掷定（cls=ri(0,2)；cls2 再 d=ri(3,7)）。

**章谱（§R2）+教学链/星级/存档零改动**：flat0 qi0 恒 find do 有序（教学
看→帮→独原样可演示）；retries 0/≤2/其他=3/2/1 星；档键 kidsgame_notebird/
sv.notebird.tutSeen 不动。章末预告 CHAPTERS/GEN_HINTS 文案**零改动**
（ch4 章名「大挑战」泛化覆盖新题型，避免主线 T10 C7 计分与 verify ⑧ 三层
联动漂移——裁量：预告精度换断言面稳定）。

## §R2 难度谱定稿（CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（零改动） | 池 | 每关 5 题结构 | 相对 r39 前 |
| --- | --- | --- | --- | --- |
| 1 | 认识小鸟 | 8 音（有序+递增站台） | find×5（free 教学特例；flat0q0 恒 do） | 零改动 |
| 2 | 听音找鸟 | 8 音（**乱序+等高站台**） | find×5 | **乱序**（破位置查表+唱窗零指认） |
| 3 | 谁高谁低 | 8 音（乱序） | higher×5（音程 ≤2 度、相邻对 70%、近邻干扰必含——三律保留） | **乱序**（「后唱=右边」位置泄堵死，辨析更纯） |
| 4 | 大挑战 | 8 音+类目 3 | [find, higher, **melody**, **interval**, 掷币 h/find] 位洗牌（find≥1+higher≥1+melody==1+interval==1 恒成立） | +**melody×1**+**interval×1**（原掷币混合废除） |
| ≥20 | 生成关 | 同所在 dch | 同上（dch=ri(1,4) 先取数保确定性，b25 坑④） | 同 |

- 首见地图：melody/interval 均 ch4 首见（flat15+；生成关 dch4 同）。
- 锚点（结构性，机检）：flat0 qi0 恒 {kind:'find', ansNote:'do', notes
  完全升序}；CH_LEN=5、STATIC_LEVELS=20、种子 mulberry32(flat×7919+13)、
  星级/存档语义全不动。

## §R3 生成律（确定性通道不变；verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)；genLevel/specSeqOf/buildQuiz
  分层不变。shuffled(arr) 消耗 rnd=len-1 次；ri(rnd,lo,hi) 恰 1 次。
- **genLevel**：flat≥20 → dch=ri(1,4)（1 rnd）否则 diffOfCh（0 rnd）；
  specs=specSeqOf(dch,rnd,flat)；逐 spec buildQuiz(spec,dch,rnd)。
- **specSeqOf（rnd 消耗次序=实现序，pycheck 逐位对拍）**：
  - dch1/dch2（find×5）：每题 pickNote(prev)（≥1 rnd，≤8 轮重掷；flat0
    题0 恒 do 零消耗）——与 r39 前逐位相同；
  - dch3（higher×5）：每题 pickPair(prev)（d 掷 1 rnd：70% 相邻/30% 跳 2
    +lo=ri(0,7-d) 1 rnd，答案重掷 ≤8 轮）——与 r39 前逐位相同；
  - dch4：coin=rnd()<0.5（1 rnd，'higher'|'find'）→ kseq=shuffled
    (['find','higher','melody','iv',coin])（4 rnd）→ 逐槽：
    find 槽 pickNote；higher 槽 pickPair；melody 槽 mel4=shuffled(ORDER)
    .slice(0,4)（3 rnd）+sang=shuffled(mel4.slice(0,3))（2 rnd）+若
    sang[0]===prev 重洗 sang ≤4 轮（每轮 2 rnd）；iv 槽 cls=ri(0,2)
    （1 rnd）→ cls2 时 d=ri(3,7)（1 rnd）→ lo=ri(0,7-d)（1 rnd）。
- **buildQuiz（rnd 同流；干扰律）**：
  - find：ds=shuffled(ORDER\\{s}).slice(0,3)（6 rnd）→ notes=dch===1 ?
    [s].concat(ds).sort(byOrder)（有序，0 rnd——dch1 谱面保留）：
    noSort(shuffled([s].concat(ds), rnd))（**r39-bis：站位真洗牌 3 rnd 后
    仍走 noSort 兜底——防答案恒 index0，§R13 F1**）；
  - higher：nearPool（题面两鸟相邻音）随机 1（1 rnd）+other do-while 随机
    （≥1 rnd）→ notes=noSort(shuffled([lo,hi,near,other], rnd))（**3 rnd，
    r39-bis 防答案恒 index1**）+sang=rnd()<0.5 ? [lo,hi] : [hi,lo]（**1 rnd，
    r39-bis M1 方案 c——唱序随机，flashSang 按 sang 序亮，后亮不再恒=hi**）；
  - melody：notes=noSort(spec.mel4)（洗牌结果直接用，非全升序兜底；sang
    已在 specSeqOf 洗牌，不变）；
  - interval：notes=[iv_near,iv_mid,iv_far] 固定序（三卡不洗牌：近→远
    自然序，孩子扫读零额外记忆负荷）；sang=[lo,hi] 升序不动（判定只看
    音程大小与顺序无关，无泄答面）。
  - noSort(a)：a 非完全升序则原样返回；完全升序（idxOfNote 严格递增）则
    swap(a[0],a[1])——0 rnd 消耗，确定性（真洗牌后碰巧全升序 1/24，兜底
    破坏=位置映射恒不可用）。
- **答案位均匀分布声明（r39-bis §R13）**：ch2+ find/higher 站位=洗牌 24
  排列等概率 → 答案位 {0,1,2,3} 均匀（ch1 find 升序场的目标 rank 亦对称
  均匀）；iv 三类 cls=ri(0,2) 均匀。护栏断言：find/higher 各位 ≥ceil(n/8)、
  iv 各类 ≥ceil(n/6)（verify ④ dist / pycheck hist_check 双落，§R13）。
- **rnd 流影响面（r39-bis）**：specSeqOf 全量先行取尽 rnd 流（不变）→
  每关 dch、dch4 题序 kseq、melody/iv 谱面逐位不变；buildQuiz 后置消耗
  变化（find dch≥2 +3、higher +3+1）只影响同关后续 quiz 的 buildQuiz
  掷点——dch≥2 find/higher 站位与答案位全刷新，**dch1 7 关全字段 ident
  保留（谱实证）**。40 关=7 保留+33 刷新（§R6/§R13）。
- **structWhy（全量重写）**：
  - 公共：kind∈{find,higher,melody,iv}；find/higher/melody：notes 4 互异
    ∈8 表、answer=notes.indexOf(ansNote)、初始态干净；iv：notes===
    [iv_near,iv_mid,iv_far]、answer∈[0,2] 与 sang 音程分类一致（d==1→0/
    d==2→1/d≥3→2）；
  - 有序律：dch===1 → notes 完全升序；dch≥2 → **非完全升序**（乱序律，
    find/higher/melody）；
  - find：sang==[ansNote]；higher：sang=[lo,hi] 或 [hi,lo]（r39-bis 唱序
    随机，顺序无关校验：答案=对中较高者）、|d|∈[1,2]、近邻干扰在场；
  - melody：sang 3 音互异且 ⊆notes（干扰=notes 中不在 sang 的恰 1 音）、
    _prog===0 初始；
  - 章型：dch1/2 全 find、dch3 全 higher、dch4 构成=find≥1+higher≥1+
    melody==1+iv==1；
  - 相邻题答案音互异（prevQ.ansNote!==q.ansNote；iv 题前后豁免——类目
    非音系）。
- 分布护栏（40 关构造性下限）：melody 计=5×(1+生成关 dch4 数)、interval
  计同；dch4 每关 find≥1/higher≥1；ch2+ 100% 非全升序题（interval 除外）。

## §R4 交互与救援（r23-r38 逐条自查）

- **重入矩阵（r30/r34 F1）门族一致性清点**：locked 门=uiTapBird 入口（题面
  唱窗/错窗/melody step 窗）+autoSolve/demo 豁免——**新增面=melody step 窗**
  （700×SPEED，点对中间位后的唱完锁；与既有窗同门同路径）；interval 卡与
  鸟卡共用 uiTapBird 全部门。底栏三按钮（兔兔/重玩/再听）+题面+空白监听器
  零改动；教学演示门（state.demo）零改动。
- **cur!==run 身份守卫**：uiTapBird 既有检查点原样；melody step 窗 await
  后补 cur!==run 检查（换关防旧续体错推 progress）；无跨关 timer 新增
  （flashSang 的 setTimeout 仅 higher 用、动画类不涉推进）。
- **时序面新增清单（r31/r35）**：melody 唱窗 2700+300（不折算）、melody
  step 窗 700×SPEED、interval 唱窗 1700+300（不折算）——全量入 §R9 表；
  其余时序面零改动。
- **多步状态机中间态（r25 M2）**：melody 逐点即判、进度保留、错窗后恒可
  续点（不卡死）、progress 只在点对推进（不双计）、miss 一次错点计一次
  （星级口径 retries 全关累计不变）。iv/find/higher 单步。
- **救援 idle 锚刷新语义（r24 M1）逐一声明**：答对推进=刷 lastAct（原）；
  melody step 点对=**刷 lastAct**（有效行动）；兔兔/重玩/再听/点题面=刷
  lastAct（原）；空白轻提示=不刷（原）；错点=不刷（原）。30s 答案级
  breathe 目标=cardEl(q.answer)（melody 动态 answer=当前进度位鸟——通用
  代码零改动）；14s 方向级=重播题面音（melody 重唱全序 3 音）。
- **r30 演出窗×用户行动矩阵**：新窗（melody step/interval 唱窗）与旧窗
  同路径同语义（locked 吞点+pop+bump）；交叉行为与 r39 前逐点一致。
- **谱刷新声明（r28/r32/r34）**：40/40 关谱面刷新（§R3 影响面，ch1-3
  目标流不变但站位乱序化+ch4 重排全刷新）；结构锚保留面=flat0 qi0 find
  do 有序+CH_LEN+确定性双跑一致；baseline/post 对照归档 _src/（§R6）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：specSeqOf/buildQuiz 按新谱重写+noSort+structWhy 全量重写+
  engTapBird 增 melody 分支（点对未满='step'+progress；满 3=right/done 推
  进；点错=wrong）；engWon/engStars/mulberry32/shuffled/ri/chOfFlat/
  diffOfCh 逐行不动；correctIdx 通用（melody q.answer 动态维护=notes.
  indexOf(sang[_prog])）。
- game-data.js：SING_TRIO_MS=2700 常量；IV_LABEL 类目文案表；quizTextOf/
  confirmText/confirmKeyOf/guide 文案与键构造按四型重写（纯函数——_selftest
  直调断言）；VOICE 六包装零改动；CHAPTERS/GEN_HINTS/MAIN_LINE 零改动；
  NOTES/ORDER/频率表零改动。
- game-main.js：renderBoard（interval 文字卡分支+q.freeOrder 等高站台）、
  flashSang（仅 higher 亮两鸟——find/melody 唱窗零指认）、playQuizVoice
  （四型窗分流）、speakQuiz（四型句分流）、uiTapBird（melody step 分支+
  wrong guide 四型分流+链豁免窗公式不变 7800）、replayQuizAudio（按 sang
  通用重播=1/2/3 音+flashSang 仅 higher）、autoSolve（melody 逐位点 3 次）、
  winFlow/proceed/startLevel/教学链/底栏/看护循环骨架零改动。
- **NB 钩子**：currentLevel/tapBird/replay/tutorial 原样；quiz getter 增
  prog 字段（melody 进度，只增）；answer 语义扩（melody=当前目标位动态）。

## §R6 基线证据（双证据+谱变更显式声明；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（build 双跑幂等 md5
  9075a71311f1ba6fa0dbbf0742fd502c / 844334 bytes）提取 40 关谱=
  r39-baseline.json（200 题：find 121/higher 79；生成关 dch {1:2,2:7,3:4,
  4:7}）；改造后=r39-post.json（提取器内嵌 _selftest.py 1a 腿，投影口径
  [kind,notes,ansNote,sang,answer,dch]）。保留面：flat0 qi0={find,do,完全
  升序}；200 题；40 关确定性双跑一致。变更面：40/40 全刷新=设计意图（§R3）。
- **证据②（Python 独立复算）**：_r39_pycheck.py 按 §R3 生成律 Python 独立
  实现（mulberry32/shuffled/ri 同源副本），与页内提取 40 关全量对拍
  PYCHECK 40/40 identical。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8①：四型结构律/
  乱序律/章型构成/防泄露）。
- **证据④（真实页真实点击）**：_selftest.py melody/interval 腿真实驱动
  +唱窗零指认 DOM 断言+双视口布局。
- **r39-bis（2026-09-22 修复轮）**：r39-post.json 按同一 --extract 口径
  重抽（站位真洗牌+唱序随机后的谱面，§R13）；r39-baseline.json 禁改。

## §R7 存档与兼容（verify_one 逐腿清单）

无档结构变化：档键/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/sv.notebird.
tutSeen 全不动；kind/prog 均运行态不入档。旧档通关星级与新谱无矛盾
（题面全刷新、星级语义不变）。

**verify_batch27.py notebird 段（主线腿 11 项）改前基线全绿；r39 后过时腿**：
T6/T7 演出窗 prewait 2500（melody 3000 窗略过界——驱动关 flat5/10 无 melody
不破）；T8 flat10 dch3 全 higher（ch3 谱零改动仍真）；R8 真实路径推进
（verify_final27）f10 kinds 全 higher 同理不破；**T4 附近章节构成断言若涉
dch4 掷币口径需按新构成律核**。**适配版 verify_one_notebird_r39.py 归档
_src/（本 agent 实施+实测）；主线侧建议以适配版收编（声明不实施）**。

## §R8 verify/_selftest/build 适配清单（四层联动，改前 grep `== N` 清点）

改前全款 `== N` 计数断言清点：**game-verify.js 12 处**（keys.length===30/
quizzes.length!==CH_LEN/notes.length!==4/d===1 占比 ≥0.5 等）、**build.py
9 处**（n_clips==30/len==1/confirms==16 等）、**verify_batch27.py（主线）
notebird 关联 4 处**、**gate_common27.py 0 处**（NCLIPS 传参）。联动面：
- **game-verify.js**：①频率表自检零改动；②40 关审计循环重写（四型
  structWhy+乱序律+dch4 构成）；③封闭集对账扩 melody/iv 分支；④higher
  专项保留+新增 **melody 专项**（sang 互异⊆notes/干扰恰 1）与 **interval
  专项**（分类独立复算 d→answer）；⑤点鸟单元保留（flat5 dch2 find——
  注意新键引导句断言改 not_g_hi2/lo2）；⑥教学链零改动；⑦⑧家族/预告
  断言零改动（文案零漂移）；⑨clips 30 键断言**保持**（新键注册后主线联
  动 39——§R10 声明）；⑪合成音时序增 melody 三音 ts 差=1000×2；⑫⑬⑭
  零改动；⑮冒烟 B 增 melody/interval 驱动；⑯布局增 interval 三卡腿；
  **⑰ 新增防泄露单元**（find/melody 唱窗+重听后 board 零 .singing 类；
  higher 唱窗两鸟亮）+**⑱ melody 单元**（flat15 驱动至 melody 题：3 点
  'step'×2+'right'/错点进度保留 miss+1/唱窗 2700）+**⑲ interval 单元**
  （flat15 驱动至 iv 题：三卡在板/分类独立复算/错对判定）——总单元
  56→**59**。
- **_selftest.py（自写，r39 首建）**：MUTE 双保险（r19 红线：MUTE_INIT
  init script+正常模式种档 settings{sound:false,tts:false,vol:0}）；1a 谱
  投影腿；1b Python 独立表断言（四型结构律+乱序律 40 关）；2a 键构造直调
  腿（quizTextOf/confirmKeyOf/confirmText/guide 键——期望值从 §R10 表硬
  编码推导，r37 M1）；2b melody 真实驱动腿；2c interval 真实驱动腿；
  2d 防泄露 DOM 断言腿；3a 双视口布局（含 interval 三卡）；4 正常模式
  主流程腿（教学→通关→写档）；0 pageerror/0 http 外联。
- **build.py**：新增硬性检查——SING_TRIO_MS 常量+2700==3*(700+300) 自洽、
  IV_LABEL 三键、四型键构造在场（confirmKeyOf 含 not_cf_mel/not_cf_iv、
  guide 键 not_g_hi2/lo2/h2/mel/iv）、flashSang 仅 higher（'flashSang' 分
  支结构锚）、noSort 在场、wrongChainUntil 7800 公式复核（新链最长
  estMs(10 字)=4050：2832+150+4050+300=7332≤7800）、interval 卡渲染锚；
  n_clips==30 **不变**（manifest 未动）。
- **主线侧（声明不实施）**：①gen_clips notebird 段 9 新键（§R10）；②
  verify_batch27.py notebird 段以适配版核（§R7）。

### §R8.1 r39-bis 修复轮适配（2026-09-22，F1/M1/M2+minor1/2，详见 §R13）

- game-verify.js：④ dist 并入答案位直方图+iv 三类计数断言（单元数 59
  不变）；⑰ 第二检查点 `.singing` >=1→**>=2**（M2 收窄）；②③ higher
  sang 复算改顺序无关（abs 音程+答案=对中较高者）；⑨ 注释头 39 键终态；
  ⑯ estChain 改 9 字 estMs=3705（链 6987≤7800）；durSpec not_g_h2 保留
  旧值 3144+行尾注释（主线重合成后更新）。
- _selftest.py：2a SPEC_KEYS g_higher 新文案；2d-b 第二检查点 >=2；1b
  higher 音程 abs+并入 hist_check（与 pycheck 同律）。
- _r39_pycheck.py：**生成律先同步修复**（站位 shuffled+唱序随机+rnd 消耗
  对齐 game-core.js，否则 1b/pycheck 全红）+hist_check 聚合断言（HIST 行，
  非 0 退出）。
- verify_one_notebird_r39.py：struct_check higher 已用 max(si) 顺序无关、
  find sang==[notes[ans]] 单音不涉序、T6/drive 用 q.answer 驱动——**零改动
  核对通过**；T11 下界=6732≤7800（len 口径含全角逗号=10：2832+150+3450+300；
  复审 m2 曾勘误 6387——**主线实测推翻**：verify_one maxlen 取整串 len，
  「9 字版」是汉字数口径（⑯ estChain 用 han()），两口径并存即复审 minor5 旧债）。
- build.py：NOT_G_H2_HAN 10→9；clips 注释 30→39 终态。
- 注释债（minor1）：head.html 谱面注释按终态重写（ch1 递增/ch2+ 等高/
  higher 唱序随机/iv 三卡）；game-main.js 教学链 3400→3600+主线句窗
  4100 clip 口径。
- **终版 index.html md5=4f83957bfcb6d0befee2be74d5fd189a**（2026-09-22 终态；
  前态 75766951→复审 minor 清理后 re-build：game-main 两处+game-verify 一处
  陈旧注释改实测口径+直方图 dch≥2 过滤三处）。not_g_h2 新文案重合成 2928ms
  （durSpec 回填+g 族 max 注释 2928+ASR 复核文案正确）；r39-post.json 重抽
  （--extract 同口径）。**终态全门禁（4f83957a 实跑）**：build 双跑幂等 +
  VERIFY 59/59×2 双视口 errs=0 + _selftest 12/12 + verify_one 11/11 +
  pycheck 40/40（HIST OK：find {23,20,18,15}≥10/higher {16,15,20,14}≥9/
  iv {2,5,5}≥2）+ gate NB 39 3/3。

## §R9 时序参数实测口径（r23 P2-1/r35 M-1 红线：SPEC 值=实现值；全量表）

| 参数 | 值 | 调用点 | r39 变化 |
| --- | --- | --- | --- |
| 判对演出窗 | 900+1800+3300=6000ms×SPEED | uiTapBird right | 原样（罩 not_cf_* 2952+新 cf_mel/cf_iv 预估 ≤3000——注册后实测复核） |
| 错点防重入窗 | 1000ms×SPEED | uiTapBird wrong | 原样（melody/iv 同门） |
| 错反馈链豁免 wrongChainUntil | 7800ms 不动 | uiTapBird wrong | **改链构成（r39-bis 9 字终态）**：not_g_h2 estMs(9 字)=3705 → 链 2832+150+3705+300=6987≤7800；实长口径 2928 → 链 6210≤7800 ✓（mutagen 2026-09-22） |
| find/higher 唱窗 | 700+300 / 1700+300ms（不折算） | playQuizVoice | 原样 |
| **melody 唱窗** | **3×700+2×300=2700+300ms（不折算）** | playQuizVoice | **新增**（SING_TRIO_MS=3 唱+2 间隔） |
| **interval 唱窗** | **1700+300ms（不折算）** | playQuizVoice | **新增**（同 higher 两音窗） |
| **melody step 窗** | **700ms×SPEED** | uiTapBird melody 点对中间位 | **新增**（唱完该音再接下一指） |
| 教学链各窗 | 900/2700/4100/500/320/900×SPEED+固定段 | tutorialWatch | 原样（零改动） |
| turn 后读题延 | 2100ms setTimeout | tutorialWatch 尾 | 原样 |
| 看护轮询/救援门/教学重演示/纠错节流/空白节流/章末推进/queue 停顿 | 1000/14000/30000/5000/10000/10000/3400/150ms | 各处 | 原样 |

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest；**9 键**）

注册前过渡态（r29 m3/r31 §R10 先例；core 阶段3 TTS 通道已删 2026-09-20）：
缺 clip 时 play/queue 静默无声+console.warn（非 pageerror）——9 新键注册前
不可听；视觉/交互/判定/演出/救援完整不受影响（_selftest 在缺 clip 态全绿
为证）；主线注册后自动完整。

| 族 | key | 文案（clip 合成文本=game-data.js 表一字一致） | 用途 |
| --- | --- | --- | --- |
| find 引导（乱序音序语义） | not_g_hi2 | 再听一听，它更高些（9 字） | find 错（所点比答案低→答案更高） |
| 同上 | not_g_lo2 | 再听一听，它更低些（9 字） | find 错（所点比答案高） |
| higher 引导（听辨引导） | not_g_h2 | 再听一遍，谁的声音高（9 字，**r39-bis 改**） | higher 错（唱序随机后旧句「后唱的声音高」成半数错误陈述——r39-bis 同步换；主线重注册重合成） |
| melody 引导 | not_g_mel | 再听一遍，照顺序点（8 字） | melody 错 |
| interval 引导 | not_g_iv | 再听听，隔了多远（7 字） | interval 错 |
| melody 题面句 | not_q_mel | 听一听，学着唱一遍（8 字） | melody 唱后读题 |
| interval 题面句 | not_q_iv | 听一听，隔了多远（7 字） | interval 唱后读题 |
| melody 确认句 | not_cf_mel | 对啦，唱得真好（6 字） | melody 答对 |
| interval 确认句 | not_cf_iv | 对啦，耳朵真准（6 字） | interval 答对 |

- 拼接卫生（r34 M1 朗读检查）：错链朗读=「再听一听，谁的声音〔.〕+引导句」
  ——not_g_hi2 起句「再听一听」与 not_wrong **起句**『再听一听』复现（整链
  双起句，150ms 停顿隔开非叠字，r39-bis 勘误：原记「尾句」系描述错位）；
  not_g_h2（r39-bis 版「再听一遍，谁的声音高」）起句「再听一遍」与 not_g_mel
  同族（不同题型永不出链，无叠字面）；题面/确认句独立 play 不拼接。
- 退役键（保留注入不删）：not_g_right/not_g_left/not_g_higher——乱序后
  位置语义误导，停用；build n_clips==30 与 verify ⑨ 计数不变（死键仍在
  manifest/注入，主线择机清理非本轮面）。
- gen_clips 注册要点（主线）：notebird 段 T46 九行（文案照上表一字一致）；
  注册后 clips 注入 30→**39**——build.py n_clips 断言与 verify ⑨ 计数由
  主线联动改（§R8 声明）。
- 时长窗约束（注册后必验，r36 M6 先例）：九键实长——引导句族 ≤4518
  （wrongChainUntil 7800 界）；cf_mel/cf_iv ≤5700（判对窗 6000-300 界）；
  q_mel/q_iv 独立播无窗约束（唱后读题，与点选并行）。

## §R11 验收数字（Executor 自测门禁实测——主线独立复验为准）

实测日 2026-09-21。VLM 视觉核验驱动两项修复：iv 卡 OCR 裁决三卡渲染正常；唱名标签
14px 站台截断（基线存量）→ 30px 基数修复+几何断言全过（§R1 扩展②）。

| 门禁 | 实测 |
| --- | --- |
| build 双跑幂等 | md5 **d27ee2d7d92269c4626079159edfb9fd** ×2 一致（866553 bytes）；clips 30 条注入正常 |
| VERIFY 双视口 | 1280×800 与 800×1180 各自 title=VERIFY PASS **59/59**、0 pageerror（r39-verify-run3.json） |
| _selftest.py | **12/12 PASS**（melody 真实驱动 r1=step/rw=wrong 进度保留/r3=right；interval flat16 三卡；防泄露 0 指认；键构造直调；正常模式错 1 次=写档 2-0 两星；双视口截图非空白） |
| verify_one_notebird_r39.py（适配版归档 _src/） | **11/11 PASS**（T1 59/59 复跑/T3 四型谱全对账+melody 逐位点序列/T6 melody step 族 wrong→进度保留→step×2→right/T11 L=11字 下界 7077≤7800） |
| _r39_pycheck.py | **40/40 identical**（--extract 重提取后对拍） |
| 谱对照（baseline→post） | 40/40 关：dch1 7 关（静态 5+生成 2）谱面逐位保留，其余 33 关全刷新（ch2-3 站位乱序化+ch4 重排=设计意图）；flat0 q0 锚保留 find/do/完全升序 |
| 分布实测（40 关 200 题） | kinds **{find:111, higher:65, melody:12, iv:12}**；melody=iv=5 静态+7 生成 dch4=12 ✓；dch4 每关 melody==1+iv==1+find≥1+higher≥1；ch2+ 非全升序 100%（interval 除外） |
| 视觉核验（r34 ⑳ 补充） | iv 卡 RapidOCR 三卡文字全识别；n-label 几何断言 ch1(30/46/62/78)/ch2(等高 30) 全部底边在卡内（旧 14px 基数截断已修） |

## §R12 风险与未验证项（如实；r39-bis 更新）

- 儿童时长为推断非实测：乱序后 find 需绝对听辨（位置支架撤除）、melody
  序列工作记忆、interval 音程定量——真机回归观察：ch4 melody 序错位分布
  （第 2/3 位错多还是首位错多）、interval d=2 vs d=3 边界误判（隔一个/
  隔好几个分界）。**「ch2 乱序首关 miss 率」观察项在 r39 版无意义（恒位
  缺陷 F1 使 ch2+ 可点固定卡位绕过音频，miss 率失真偏低）——r39-bis 根治
  恒位+时序轴后才重新成为有效观察项。**
- **F1 族教训（r39-bis 补记，防复发）**：「非完全升序」≠「答案位均匀」
  ——noSort 保住乱序律但**输入拼接序决定答案恒位**（find 恒 index0/
  higher 恒 index1，仅 1/24 全升序对调偏移）；时序轴（higher 后亮恒=
  答案）是位置轴之外的第二条绕过轴。结构断言必须含**分布护栏**（答案位
  直方图下限），否则恒位回归在 59/59 全绿下静默复发（verify ④ 与 pycheck
  同源复算均不拦——断言与实现同盲区）。
- not_g_h2 新文案（9 字）注册前过渡态：manifest 现 clip 仍为旧 10 字版
  （「后唱的声音高，再听一遍」）——higher 错反馈**播旧文案音频**，与唱序
  随机后半数题不符（「点后亮的」策略已被唱序随机拆除，音频误导为存量
  瑕疵）；主线重注册重合成后消失（durSpec 旧值 3144 届时更新实测）。
- ch2 乱序对不识唱名标签的孩子=纯听辨+试错逼近（错反馈二分+救援 breathe
  兜底）——若真机 ch2 miss 率畸高，下轮候选=ch2 前半关保留有序过渡。
- melody「跟唱」为点选复现（非真跟唱发声）——形态取舍：产出性跟唱无判定
  通道，点选复现保留序列记忆负荷（审计字面「跟唱复现」的可判定化）。
- interval 三分类中 d≥3 类内跨 3-7 度差异大（3 度 vs 7 度同为「隔好多
  个」）——类内粒度牺牲换三分类防蒙（如实声明，非缺陷）。
- 唱窗零指认后 find 题对听障/静音环境不可玩（原版动画泄答反可「玩」）——
  救援 breathe 30s 兜底视觉答案；听辨款本意如此（如实声明）。
- 主线 R8（verify_final27）真实路径推进腿 f10 kinds 全 higher 断言不受
  ch3 谱零改动影响；但若主线在他款（coin）在飞期间联动改 verify_batch27
  notebird 段，以适配版为准核对。

## §R13 r39-bis 修复轮记录（2026-09-22；上游 REPORT-REVIEW-r39.md fatal1/major2）

- **F1（fatal，答案恒位）根因**：buildQuiz 的 find 用 `noSort([s].concat(ds))`
  ——答案音恒在拼接数组 index0；higher 用 `noSort([lo,hi,near,other])`——
  hi 恒 index1；noSort 仅整体完全升序（4 音 1/24）才对调前两位。孩子点
  固定卡位 ~96% 命中，防策略化主承重失效（谱面实证：r39 版 flat5 find
  answer 全 0、flat10 higher 恒 1；对照 baseline 原版 answer 0-3 均匀）。
  **修复**：站位真洗牌 `noSort(shuffled(..., rnd))`（find/higher 各 +3
  rnd）——洗牌后仍走 noSort 保「非完全升序律」（1/24 全升序兜底对调不变）。
- **M1（major，时序轴泄漏）根因**：higher sang 恒 [lo,hi]（低先高后）+
  flashSang 按 sang 序亮 → 后亮恒=hi=答案；旧 not_g_h2「后唱的声音高」
  直接明示元规则。**修复（方案 c 根治）**：sang=rnd()<0.5 ? [lo,hi] :
  [hi,lo]（1 rnd，实测 65 题中 32 题逆序）+文案改「再听一遍，谁的声音高」
  （9 字，主线重注册重合成——过渡态播旧 clip，§R12）。
- **M2（major，断言无判别力）**：verify ⑰ 与 _selftest 2d-b 第二检查点
  `.singing >= 1` 恒真（类只加不删，第一鸟亮后类持久存在）——第二鸟
  丢失不拦。**修复**：第二检查点改 **>=2**（两鸟都在场才过；第一检查点
  >=1 保留）。
- **直方图断言设计（防回归核心）**：40 关聚合，从 SPEC 均匀分布推导半值
  下限（禁抄实现观测）——find 答案位 {0,1,2,3} 各 ≥ceil(n_find/8)（期望
  n/4 半值；恒位回归时 3 位计数≈0 必拦）；higher 同理；iv 三类 ≥ceil(n_iv/6)
  （期望 n/3 半值；**主线原案 n/4 在 40 关确定性流实测 near=2<3 假阳**——
  12 题小样本按 find/higher 同款半值律取 n/6，恒类/双类回归 0<2 仍必拦，
  已报备主线）。双落：game-verify ④ dist（JS 侧）与 _r39_pycheck
  hist_check（Python 侧，_selftest 1b 同律）。
- **rnd 消耗核对**：shuffled(arr) len-1 次/调用——4 元站位洗牌恰 3 rnd；
  higher 唱序 coin 1 rnd。specSeqOf 全量先行取尽 rnd 流（不变）→ dch/
  kseq/melody/iv 谱面逐位不变；dch1 分支消耗不变 → **dch1 7 关（flats
  0-4/26/28）全字段与 baseline ident（谱实证），1a 断言保住**。
- **修复后实测分布（40 关 200 题）**：find {35,25,28,23}、higher
  {16,15,20,14}（均过 ceil(n/8)）；iv {2,5,5}（过 ceil(12/6)=2）。
- 挂账未动：minor3（⑱⑲ wrong 链键断言缺口）/minor4（_selftest 腿 4
  注释归因）/minor5（T11 两套下界口径）/minor6（1a baseline 侧仅对
  notes）——按主线定夺挂账。

### §R13.1 聚焦复审轮（2026-09-22，REPORT-REVIEW-r39bis.md：fatal 0/major 0/minor 5 可收官）

- 全部关键数字复审员独立复算零偏差（直方图/逆序 32/65/kinds/dch 计数；bis
  前后实物 run1 vs post 逐题对照证 specSeqOf 不回渗）。
- 复审 minor 收口（本轮收官前一并处理）：
  - m1 陈旧注释四处清（game-main 3144→2928 实测口径/4050·7332→3705·6987；
    game-verify:441 同步；本表 §R9 已改 9 字终态）；
  - m2 §R8.1 T11 下界勘误 6732→6387（10 字旧式残留）；
  - m3 门禁输出行归档=§R8.1 终态矩阵+主线会话记录（r39-bis-final 门禁全套）；
  - m4 前序审查 minor2 iv 计数勘误：两期实测均 {2,5,5}（前序 "mid=6/far=4"
    为误计，不影响任何决策——n/4 假阳只依赖 near=2）；
  - m5 直方图口径升级 **dch≥2 过滤**（dch1 教学升序场答案位由排序决定，
    不入防恒位统计；find n=76 下界 ceil(76/8)=10，实测 {23,20,18,15}；
    higher n=65 下界 9；game-verify ④/pycheck hist_check 同步）。
- **iv 直方图零裕度提示**：当前确定性流 near=2 恰=ceil(12/6)=2 下界——
  换种子/改生成律时首查此项防假红（真回归=恒类 0<2，假红=1<2）。
