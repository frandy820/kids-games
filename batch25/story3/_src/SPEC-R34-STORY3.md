# SPEC-R34-STORY3 · 故事排序难度加深改造（r34，2026-09-21）

依据：AUDIT-67 段序 16 🟡 判定「实测 ~95s/关：**时长大头是复述演出非思考；
3 帧排序=4-5 岁能力，反馈泄首尾帧**」；建议三维度（帧数 ch2 起 4-5 帧+每题
1 干扰帧 / 去泄序反馈 / ch3-4 因果问句）。校准：b25 段标称 6-7 岁幼小衔接，
宁难勿易——r15-r33 同口径。本文件为 story3 的 r34 难度谱定稿；与
SPEC-BATCH25 §0.58/§1 旧文冲突处以本文件为准（r28-r32 同款声明）。

## §R0 目标（账本 §0 摘录）

保留玩法框架（槽位状态机多步排序：题面故事条 N 槽+乱序帧卡逐槽点选+星级+
救援+教学 看→帮→独），消除「认知空心/演出窗撑时长」——改造后须达到
6-7 岁叙事顺序+因果推理负荷。验收铁律：agent 不自验（主线独立复验为准）；
新语音键禁自注册（§R10 TODO 清单+文案，gen_clips 主线统一）；计数断言改动
前已 grep 全款 `== N` 四层联动（清点结果见 §R8 表——build.py 3 处/
game-verify.js 41 处含 `!== 3`/`'0,1,2'`/`=== 15`/`=== 23`/`=== 13`/
game-core.js structWhy `frames.length !== 3`/game-main.js `k < 3`×2/`>= 3`×2/
verify_one_story3.py T2 `len(set(ids)) != 3`+`sorted(poss) != [0,1,2]`——本轮
全部联动，无漏项）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·帧数上探（ch2 起 3→4-5 帧+每题 1 干扰帧）——全部承接，两条子论证**：
- **故事本体扩帧**：ch1 四故事保持 3 帧（起步坡+教学链兼容锚——flat0 恒
  dch1 3 帧无干扰，tutorialWatch「看→帮→独」逐行不动）；ch2 四故事扩到
  **4 帧**、ch3 四故事扩到 **5 帧**（章弧 3→4→5=排序序列长度递进；ch3 本就
  是时间线章，「一天的顺序」5 步（清晨/上午/中午/下午/傍晚）是该章自然粒度）；
  dch4 生成混合=全库 12 池（3/4/5 帧故事混出，槽位数随故事本体走——混合章
  天然难度方差，干扰帧恒在场补齐下限）。新增帧 12 幅（ch2 ×4 各 +1、
  ch3 ×4 各 +2）：SVG 严格沿用现有场景件（sunEl/girlEl/groundEl 等，viewBox
  120×90、INK 描线），帧间可视觉分辨（verify ③ art 互异断言沿用）。
- **干扰帧（1 条/题，dch≥2）——「放对任何槽都算错+专属『不属于』反馈」
  （任务书两选项中取后者，论证）**：干扰帧=同 dch 池另一故事的一帧（dch4=
  全库另一故事），pos=-1 标记、任何槽点它=wrong+miss；专属反馈
  sto_w_out「这张画不是这个故事里的哦」。理由：①与自有帧错点（泄序风险）
  不同，「不属于本故事」是**成员性**信息非**顺序性**信息——不泄露任何
  自有帧的先后位（去泄序维度不破）；②6-7 岁儿童排除法（先剔除不属于的
  再排序）是该年龄段可教的排序策略，专属反馈即教学闭环；③若无专属反馈
  （与错点共用 sto_hint），儿童无法区分「放错位置」与「根本不属于」，
  连续错点挫败。干扰帧卡片**零视觉标记**（虚线框等会把排除变秒答）。
  干扰源故事≠本题故事（机检）；与自有帧 art 互异由库互异保证。

**维度二·去泄序反馈（两处联动改）**：
- **废除方位语义错反馈**（wFirst/wMid 退休）：v1 槽0 错→「这一步还不是开头
  哦」（泄「所点帧非首位」）、槽1/2 错→「这一步已经讲过啦」（泄「所点帧
  在当前槽之前」）——3 帧下每槽一次错点即由排除法锁定正确帧（错点反馈+
  小候选面=审计「反馈泄首尾帧」实指：首帧由「还不是开头」排除锁定、末帧由
  剩余唯一锁定，星级 floor 被反馈垫高）。r34 起自有帧错点→**sto_hint 复用**
  （「想想先发生了什么」=题面级重定向，零帧位信息）+摇头晃动（演出保留）；
  干扰帧错点→sto_w_out（成员性，见维度一）。wFirst/wMid clip 保留注入
  （manifest/构建断言不动=主线可整体收编退役，本轮不删）但**运行时零调用**
  ——verify 新增「全 vlog 无 sto_w_first/sto_w_mid」反断言（r29 交叉断言范式）。
- **不采用「反馈延迟到全部放完」**（任务书两选项中弃后者，论证）：延迟反馈
  打断 6-7 岁即时纠错回路（错点后 30-60s 的反馈无法与被点帧建立联结，
  b23 天气款语义反馈即弃此型）；即时+非泄序=保留纠错价值同时去信息泄露。
- **同关重复故事的泄序残留（显式声明）**：ch1-3 池 4 故事×5 题=1 尾非邻重复
  （v1 结构保留），首次完成的复述 TTS 会替第二次出现预演顺序——r34 缓解面：
  重复题同为 4/5 帧+干扰帧（新增帧不在首次复述句内，扩帧位仍需真排序）+
  干扰帧需重新排除。残留接受（池扩容=改章池结构，破坏 verify_one T1 章池
  封闭腿与家族章节语义，收益不成比例）。

**维度三·因果问句（ch3-4 排序完成后追加，时序→因果上探）**：
- 触发：dch∈{3,4} 且 qi∈{1,3}（每关 2/5 题，固定谱 r24/r30/r31 先例——
  确定性+verify_one 驱动腿可预判）；dch1/2 零因果问句（先排序后因果的章弧）。
- 形态：故事条保持全亮，**槽 1（首帧）pulse** + 板区换 2 张**文字选项卡**
  （.optcard ≥96×96，6-7 岁一年级上读短句能力，worden 文字卡先例）；题面
  音频=单条故事专属 clip sto_why_<story>（文案=「为什么要先{q0}呀？是因为
  {a}，还是因为{b}？你来选一选。」——正确项 a=故事真因果、干扰项 b=明显
  非因果傻理由（每故事各异，防「选非漂亮项」位置策略）；选项位次 seeded
  洗牌。点错=该卡摇头+miss+1（计入星级口径，SPEC 声明：因果问句是排序题
  的判定环节延续）+sto_why_w；点对=sto_why_right+推进下一题/通关。
- 音频窗：问句 clip 播放期间**不锁输入**（读得快的儿童可即时作答；点选
  触发的新播放自然打断问句 clip=core voice.play 单实例语义）；问句可由
  听题按钮/点故事条重播（why 相位改走 sto_why_<story> 而非 sto_q）。

**演出窗压缩声明（95s→思考占比提升）**：见 §R9 逐段时序对照表。三处实压：
①ch1 复述等待窗 estMs 估值→**实测 clip 长+300**（family H 违例修正：
v1 用 estMs(33 字)=10800ms，实测 wake 8400ms——每故事多等 2.4-3.2s）；
②题面读题 5 次/关→**首题 1 次**（sto_q 文案与故事无关恒同文，2-5 题复读
纯冗余；救援 14s 级与听题按钮保留重播通道）；③ch3 时间词点名前置等待
(2424|2280)+300→2400+300（随 wFirst/wMid 退休改锚 sto_hint 实长）。
扩帧/干扰帧/因果问句**新增思考面**：放置决策 15→19-27 次/关+干扰排除扫描
10 面+因果二选一 2 面；复述句随帧数变长（4/5 帧 28-34 字）为**思考密度
提升的必要成本**，窗口按 §R9 表逐段列明。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（不变） | 槽位数（=故事帧数） | 候选卡数 | 干扰帧 | 因果问句 | 相对 v1 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 生活 routine | 3（wake/meal/laundry/night 本体不动） | 3 | 无 | 无 | 仅反馈链改 |
| 2 自然因果 | 4（seed/cate/rain/chick 各+1 帧） | 5 | 1/题 | 无 | +1 帧+干扰帧 |
| 3 时间线 | 5（sunwalk/bird/meals/shadow 各+2 帧） | 6 | 1/题 | qi1/qi4 外即 qi1,qi3 两题 | +2 帧+干扰帧+因果×2 |
| 4 生成混合 | 3/4/5（全库 12 池随故事） | 本体+1 | 1/题 | qi1/qi3 两题 | 混合+干扰恒在+因果×2 |

- 章名/章末预告 hint/GEN_HINTS **零改动**（C7 断言面不动；新机制不加预告=
  「章首体验即教学」——4/5 帧与干扰帧是既有玩法的自然加深，非新规则）。
- 锚点（结构性，机检）：flat0 恒 dch1 3 帧无干扰无 why（教学链+verify_one
  flat0/3/6 腿+gate G2 兼容前提）；CH_LEN=5、STATIC_LEVELS=20、种子
  mulberry32(flat×7919+**25**)、星级 0/1-2/≥3→3/2/1★（永不 0 星）全不动。
- 生成关 flat≥20 循环节奏不变。

## §R3 生成律（确定性通道不变；verify/selftest/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+25)；storySeqOf 逐行不动（池取 5 题/
  4 池 4 互异+1 尾非邻重复律原样）。
- **buildQuiz(storyId, rnd, dch, qi) 新构型（rnd 消耗序固定）**：
  1. N=STORY_LIB[storyId].art.length（3/4/5）；order=shuffled([0..N-1])；
     恒等排列确定翻「交换前二」([1,0,2..]——v1 N=3 翻 [1,0,2] 行为保持）；
  2. 自有帧 frames=order.map(p=>({id:story+'-f'+p, pos:p, placed:false}))；
  3. dch≥2 加干扰帧（3 次 rnd）：源池=(dch===4?ALL_IDS:CH_IDS(dch)) 过滤
     ≠storyId → ds=pool[floor(rnd*len)]；df=floor(rnd*N_src)；插入位
     at=floor(rnd*(N+1)) → frames.splice(at,0,{id:ds+'-f'+df,pos:-1,placed:false})；
  4. why 标记（零 rnd 消耗开关+1 次 shuffled）：dch∈{3,4}&&qi∈{1,3} →
     q.why={opts:shuffled(['a','b'],rnd), done:false}，否则 q.why=null。
- **engTapFrame 扩**：frames[i].pos===-1 → wrong+miss（同自有帧错点判定，
  返回值同为 'wrong'——UI 按 pos===-1 分流反馈 clip，r29 交叉面：干扰帧/
  自有帧错点各走专属反馈，verify 双向断言）；**末槽完成且 why 待答时不推
  step**（q._answered=true 但 L.step 不动——因果问句是本题判定链的收尾，
  中间态纪律见 §R4）；末槽完成且无 why（或 why 已答）→ 原样 step++/done 判定。
- **engTapWhy(L,i) 新**：非 why 相位/已答/非法下标→null；opts[i]==='a' →
  why.done=true+L.step+++末题 done 判定→'right'/'done'；否则 miss/retries++
  →'wrong'。
- structWhy 扩：帧数=N+(dch≥2?1:0)；自有帧 poss（pos≥0）排序=0..N-1 且
  **自有子列非恒等**（乱序铁律）；dch≥2 恰 1 个 pos=-1 且其 id 源故事≠本题
  故事、帧号<源故事 N、与自有帧 id 互异；dch1 零 pos=-1；why 开关=(dch∈
  {3,4}&&qi∈{1,3}) 恒等且 opts=['a','b'] 置换；init 干净/相邻互异原样。
- **rnd 消耗流影响面（谱变更显式声明）**：buildQuiz 每题新增 0-3 次 rnd+
  why 洗牌 0-1 次→**全 40 关谱刷新，无逐字节保留关**（r28/r32 同型；保留面=
  结构锚：flat0=dch1 3 帧/确定性双跑/章池/相邻互异/自有子列非恒等）。
  baseline=post 对照口径见 §R6。
- 分布护栏（精确值=确定性谱实测，§R11 实测回填）：每题卡数 {3:45, 4:21,
  5:76, 6:58}（3=dch1 9关×5；4/5/6=dch≥2 自有帧 3/4/5+1 干扰）；干扰帧
  155=31 关×5（dch≥2 全覆盖）；why=40 题（dch3 8关+dch4 12关 × qi{1,3}）；
  dch 分布 {1:9,2:11,3:8,4:12} 与 baseline 逐关相同、flat0 谱逐字节同。

## §R4 交互与救援（lastAct 纪律核对：r23 P1-1/r24 M1/r25 M2/r30 三 major）

- **lastAct 触点（现状全保留+新增面逐一核）**：答对放置刷（right 路径——
  含末槽后的 why 相位入口 renderWhy 处刷：新交互相位起算救援钟）；why 点对
  刷；why 点错不刷（与帧错点同口径）；兔兔/重玩/听题/点故事条/空白节流原样。
- **r25 M2 多步状态机特别条款（本轮重点核）——部分正确中间态三面逐一核**：
  ①题内中间态（帧放对 k 个但序列未完成）：救援钟由最近一次 right 刷（既有），
  14s 方向级=重读题面+未放帧 pulse（correctIdx 对 pos=-1 天然免疫——干扰帧
  永不 breathe/pulse 指认为正确帧 ✓ 机检），30s 答案级=当前槽正确帧 breathe
  （**两级显式化（试玩 P3-1）**：14s 级 pulse 作用于**全部未放卡含干扰帧**=
  全体同跳零指认信息；「永不指认」语义实指 30s 级 breathe 单帧——breathe 命中
  correctIdx 恒排除 pos=-1。试玩实测 pulsed=[0..4] 全卡 vs breathe=['0']≠distract）；
  ②**why 待答中间态（新）**：故事已全对（_answered）但因果未答——L.step 未
  推、ST.quiz 恒返同题；救援分支改：14s=重播 sto_why_<story>+两选项卡 pulse、
  30s=正确选项卡 breathe（correctWhyIdx）；lastAct 由 renderWhy/why 点对刷新；
  该相位 locked=false（问句音频不锁输入），救援 interval 的 locked 门不拦——
  why 相位 idle 计时从 renderWhy 起算 ✓ 无饿死面；
  ③关内中间态（题间推进）：原样。
- **r30 演出并发重入矩阵（演出窗大=重点）**：why 相位是**新增演出窗**——
  矩阵：{问句 clip 播放中}×{点选项（判真值，voice.play 单实例打断问句=正确
  行为）/重玩（startLevel 重建 cur——renderWhy 的 DOM 已被重建覆盖，无迟到
  续体：why 渲染无 setTimeout 排队 ✓）/听题（重播问句 clip）/兔兔（why 相位
  兔兔=sto_hint 方向提示原样）}×{救援 timer（14s/30s 分支按相位分流，无新
  timer 句柄——why 重播走即时 play 无 pending timeout）}。复述演出窗（recap
  chain await 段）身份守卫 `cur !== run` 原样；帧飞入 450ms lightSlot 迟到
  守卫原样。why 点对路径 winFlow 前无迟到面（同步判定+短窗）。
- **吞输入**：demo/locked 门原样；why 相位点帧卡区（板区已换选项卡，无帧卡
  可点）；重玩/听题/兔兔/空白各门原样。
- **救援链（原样）**：14s 门+1s 轮询触发窗 [14,15]s（r31 ⑤统一口径）；
  错反馈 10s 节流（sayW flat≥3）覆盖 sto_hint/sto_w_out/sto_why_w 三键。

## §R5 引擎与钩子（向后兼容）

- game-core.js：buildQuiz 重构（§R3）+engTapWhy 新+engTapFrame 末槽 why 分支
  +structWhy 扩；mulberry32/shuffled/ri/storySeqOf/chOfFlat/diffOfCh/engWon/
  engStars/correctIdx **逐行不动**（correctIdx 判定 `pos===q.slot` 对 pos=-1
  干扰帧天然排除——零改动兼容）。
- game-data.js：STORY_LIB ch2 ×4 各+1 帧（art+s）、ch3 ×4 各+2 帧；全部
  s[] 句长收紧 ≤7 字（复述窗成本控制）；12 故事各加 why:{q0,a,b}；VOICE 加
  wOut/whyW/whyRight；recapOf 按 N 取连接词（3=[先,然后,最后]/
  4=[先,然后,接着,最后]/5=[先,然后,再,接着,最后]——顺序词词汇量递进是
  叙事教学面非纯文案）；recapKeyOf（N=3 沿用 sto_recap_<story> 现有 clip、
  N=4/5 走新键 sto_recap4_/sto_recap5_）；recapWaitOf（N=3=SPEC_DUR 实测+300、
  N=4/5=estMs 过渡态）；CHAPTERS/GEN_HINTS/QUIET_TEXT/ICONS 零改动。
  （**注册后勘误 r34 审查 m2**：recapWaitOf 未单列函数——实现为 game-main 直查
  RECAP_DUR[id]+300 全量表；N=4/5 已按注册音频实长量化，estMs 已删（零活引用）。）
- game-main.js：renderSlots/renderBoard 动态 N（dataset.n 驱动 CSS 变体，
  板区 flex-wrap 两行 3+3）；renderWhy 新（板区换 .optcard×2+槽1 pulse）；
  uiTapWhy 新；uiTapFrame 错点反馈分流（pos===-1→wOut/其余→hint）+末槽
  why 相位入口；speakQuiz 读题门（仅 cur.step===0，v1 每题读）；autoSolve
  扩 why 相位（correctWhyIdx）；救援 interval why 分支；tutorialWatch 循环
  泛化（s<q 自有帧数——flat0 恒 3 行为不变）；ch3 时间词点名锚改 2400+300；
  听题/故事条点按在 why 相位分流到问句 clip。
- head.html：#board{flex-wrap:wrap}+data-n="4" 单行紧凑变体；.optcard 选项卡
  （≥96×96、22px 大字）；.slot.why-first pulse；竖屏适配。
- **ST 钩子**：currentLevel 原样；quiz getter 增 `answered`/`why{on,done,opts}`
  两字段（既有字段 story/frames{id,pos,placed}/slot/step/miss 零变化——
  frames 含 pos=-1 干扰帧是既有数组语义扩展，verify_one 驱动协议 pos==slot
  命中法天然兼容）；tapFrame 原样；**新增 tapWhy(i)**；autoSolve 扩（返回
  taps 含 why 点选）；start/tutorial 原样。
- **verify_one_story3.py 逐腿核对见 §R7 兼容清单**（适配副本随款归档）。

## §R6 基线证据（双证据+谱变更显式声明，r27-r32 范式；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（md5 `ac506fbdf53e9f17e61898e61d322841`
  /1156772 bytes）提取 40 关 quizzes JSON=**r34-baseline.json**（实测：200 题
  全 3 帧/零 why/零 pos=-1）；改造后=**r34-post.json**（提取器
  _r34_extract.py 归档 _src/，投影字段 [story, frames[{id,pos}], why?]）。
  - 对照口径：buildQuiz rnd 流变更→**40/40 关全刷新无逐字节保留关**（r28/r32
    同型）；保留面=结构锚机检：①40 关确定性双跑一致 ②flat0 恒 dch1 3 帧
    （与 baseline flat0 逐字节同帧序——教学链兼容实证）③章池归属/相邻互异
    ④dch≥2 干扰帧恒 1/题 ⑤why=dch3/4 且恰 qi1/qi3 ⑥自有子列非恒等。
- **证据②（Python 独立复算）**：_selftest.py 内嵌 Python 版 genLevel 镜像
  （mulberry32/shuffled 本地副本，禁引用页内函数——同源陷阱防线），与页内
  genLevel 40 关全量对拍 identical（含 frames/why 全字段）。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8 ①②③⑰⑱）。
- **证据④（真实页真实点击）**：_selftest 真实页链（教学/通关/干扰帧错点/
  why 错点对点）+新帧 SVG 与 why 面板/6 卡双行布局取证 PNG 落 _shots/。

## §R7 存档与兼容（verify_one_story3.py 逐腿清单）

无档结构变化：档键 kidsgame_story3/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/
sv.story3.tutSeen/v:'1.0' 全不动；无新增落档字段（why/干扰态均运行态）。
旧档通关星级与新谱无矛盾（谱刷新、星级语义不变，r20-r32 同款声明）。

**verify_one_story3.py（主线腿）逐腿核对（r34 后真值）**：
| 腿 | 判定 | 说明 |
| ① verify title | 兼容 | game-verify 断言已联动（§R8） |
| ② 语音捕获三通道 | 兼容 | say 整句通道仍走 vlog/play 捕获 |
| ③ T0 selftest | 兼容 | VERIFY PASS 前提 |
| ④ T1 章池封闭 | **兼容** | CH_POOL 表不动（dch1-3 池未变）；dch4 全库原样 |
| ⑤ T2 帧形状 | **断言过时（适配）** | `len(set(ids))!=3`+`sorted(poss)!=[0,1,2]`：4/5 帧题+dch≥2 干扰帧（pos=-1）必炸——适配=自有帧子列 perm 0..N-1 非恒等+恰 1 个 pos=-1（dch≥2） |
| ⑥ T3 状态机深探（DW flat5/12 k==0） | **兼容+新增面** | 双错防重入/已放帧不可点原样（flat5=dch2 干扰帧在场：wi 取 pos!=slot 且 !placed 可能命中 pos=-1——错帧判定同为 wrong，miss/slot 断言语义保持 ✓）；干扰帧错点新断言进适配版 |
| ⑦ flat6 已放帧 | 兼容 | placed 帧再点 null 原样 |
| ⑧ T4 方位反馈 | **断言过时（适配）** | wFirst/wMid 退休：适配=自有帧错点→vlog 'sto_hint'+全 vlog 无 sto_w_first/sto_w_mid（反断言）+干扰帧错点→'sto_w_out' |
| ⑨ T5 确定性 | 兼容 | 双读 JSON 同 |
| ⑩ T6a 星级（排探测） | 兼容 | 驱动循环 right_idx 命中法对 pos=-1 免疫 |
| ⑪ T6b 1 错=2★（flat3/9） | **兼容（驱动补 why=无）** | flat3=dch1/flat9=dch2 均无 why ✓ 原驱动循环不需 why 分支 |
| ⑫ T7 复述句 | **断言过时（适配）** | flat0 题0=ch1 故事 3 帧格式「先…然后…最后…」仍真值 ✓ 字面断言兼容；适配版补 4/5 帧格式（接着/再）断言 |
| ⑬ 主驱动循环（40 关） | **断言过时（适配）** | dch3/4 qi1/qi3 故事完成后 step 不推（why 待答）→stepped(k) 超时炸：适配=循环内 `_answered&&why&&!done` 分支 tapWhy(correctWhyIdx)；guard 上限 8→12（5 帧+why） |
| ⑭ T10 家族 A+B | 兼容 | game-main 源码断言原样命中 |

**结论：14 腿中 4 腿断言过时（T2/T4/T7 补强/主驱动），全部因谱升级非回归。**
适配版 `_r34_verify_one_adapted.py` 随款归档 _src/（r34 审查 m5 勘误：文件名；主线采信后已整替正文）；
本 agent 未动 batch25/verify_one_story3.py 正文（主线文件）。

## §R8 verify/_selftest/build 适配清单（四层联动）

`== N` 四层清点（改动前 grep 实录）与去向：
| 层 | 断言 | r34 去向 |
| build.py | `n_clips == 23`/`count('nextHint(lim - 1)') == 2`/`count('lastDir = Date.now()') == 2` | 全保留（clips 不新增注入；A/B 契约零改动）；**新增硬检查 4**：engine 含 `pos === -1`+`engTapWhy`、data 含 `sto_recap4_seed`+`why:`、main 含 `optcard`+`tapWhy`、verify 含 `w_out`+`why` 断言锚 |
| game-verify.js | `frames.length !== 3`/`sorted '0,1,2'`/`=== 15`/`=== 23`/`=== 13`/`s === 2` 等 41 处 | ①审计循环按 §R3 新律（N 动态+干扰+why）；②封闭对账加帧数表（ch1:3/ch2:4/ch3:5 独立重列）；③库完整性 s/art/why 长度按章断言+复述 4/5 帧格式；④状态机加干扰帧错点/why 引擎单元；⑤反馈=非泄序（自有错→sto_hint/干扰→sto_w_out/**全 vlog 无 wFirst/wMid**）；⑥时间词原样；⑦-⑧原样；⑨flat0 taps=15 原样；⑩flat10 taps=27（25 帧+2 why）+1 错=2★；⑪recap 4 帧格式；⑫布局加 flat12（5 槽 6 卡）+why 面板（flat10 进 qi1）双视口+选项卡 ≥96；⑬23 条+过渡注释；⑭⑮⑯原样；**⑰干扰帧专项**（在场/错点/成员反馈/不清已对/不 breathe）；**⑱why 专项**（触发位/洗牌/错点不推进/对点推进+sto_why_right/dch1-2 零 why） |
| game-core.js | structWhy `!== 3`/恒等检查 | §R3 新律（N 动态/自有子列/恰 1 干扰/why 开关） |
| game-main.js | `k < 3`×2（renderSlots/tutorial）/`>= 3`×2（storyDone/演示尾顿） | 动态 N：renderSlots k<自有帧数=frames.filter(pos>=0).length；storyDone=slot>=自有帧数；tutorial 泛化（flat0 恒 3 行为不变） |
| verify_one_story3.py | §R7 清单 | 主线适配（_r34 副本先行归档） |
| gate_common25.py | G3 NCLIPS | 23 不变（新键未注册）；G1/G2 flat0 兼容（**注册后勘误**：G3 实跑 n=46，ST 46 口径） |

- **_selftest.py（新建，b25 首个 story3 真实页自测——habitat r4/worden r32 同款）**：
  MUTE_INIT（r28 words 定稿 function 版逐字）+种档 sound:false/tts:false/vol:0
  双保险；①VERIFY 页全绿+0 pageerror；②Python genLevel 镜像 40 关对拍；
  ③真实页教学链（看→帮→独+__stDemoR）；④flat0 autoSolve 3★+写档
  tutSeen/v1.0；⑤flat5 干扰帧错点（vlog sto_w_out+miss+不清已对）+自有帧
  错点（sto_hint+全 vlog 无 wFirst/wMid）；⑥flat10 5 帧+why（qi1 面板
  选项卡 2 张+错点不推进+对点 sto_why_right 推进）；⑦双 viewport 布局
  （flat0/flat12/why 面板：槽 ≥64、卡/选项卡 ≥96、overflowX≤0、PIL 像素
  非空白取证 _shots/）；⑧谱护栏（dch≥2 干扰恒 1、why 恰 qi1/qi3、
  flat0=baseline flat0 帧序逐字节同）。
- **主线侧（声明不实施）**：①gen_clips 注册 23 新键（§R10）+manifest 加
  games:['story3']+主线重建；②verify_one_story3.py 按 §R7 适配（或采信
  _r34 副本）。

## §R9 时序参数实测口径（r23 P2-1 红线+r31 教训①：SPEC 值=实现值，逐调用点）

**clip 实长实测（mutagen，build 前量化，family H）**：sto_recap_wake 8400/
meal 7704/laundry 8424/night 7560/seed 7560/cate 7704/rain 7128/chick 8040/
sunwalk 7464/bird 7752/meals 7392/shadow 7080/sto_right 2832/sto_hint 2400/
sto_q 2640/sto_hint3 5328（v1 estMs 对 ch1 复述估值 10800/10530 等——
**v1 等待窗平均多等 2.7s/故事**，本轮修正的量化依据）。

| 参数 | 值 | 调用点 | r34 变化 |
| --- | --- | --- | --- |
| 帧飞入+点亮窗 | 560ms×SPEED | uiTapFrame right await | 原样 |
| 错点防重入窗 | 1000ms×SPEED | uiTapFrame wrong await | 原样 |
| 复述等待窗 | N=3：实测+300（wake 8700/meal 8004/laundry 8724/night 7860）；N=4/5：estMs(text)（新键注册前过渡，主线注册后按 §R10 表实长改+300） | uiTapFrame recap 段 | **压缩：ch1 每故事 -2.4~-3.2s** |
| sto_right 窗 | 3150ms×SPEED | 同上 | 原样（2832+300） |
| why 问句播报 | 即发不锁（fire-and-forget play） | renderWhy | **新增——零 await 零 timer**（r30 教训①：无新演出 await 窗即无新重入面） |
| why 点对窗 | 3700ms×SPEED（sto_why_right 预估 3400+300，§R10） | uiTapWhy right await | 新增 |
| why 点错窗 | 1000ms×SPEED | uiTapWhy wrong await | 新增（与帧错点同防重入口径） |
| 题面读题 | 仅 cur.step===0 时播（speakQuiz；救援/听题/点条重播不限） | renderQuiz | **压缩：每关 -4×2940ms** |
| ch3 时间词点名 | clipMs=2400+300（原 (2424|2280)+300） | uiTapFrame wrong dch3 分支 | 随 wFirst/wMid 退休改锚 sto_hint 实长 |
| 教学演示节奏 | 700/900/320/(950|500)ms×SPEED | tutorialWatch | 原样（循环上界泛化，flat0 恒 3 帧节奏不变） |
| 看护轮询/救援门 | 1000ms interval/14s 门+1s 轮询窗 [14,15]s/30s 答案级 | interval | 原样（why 相位分支见 §R4） |
| 教学 help 重演示 | 5000ms | interval | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样（覆盖三新键） |
| 章末/日末推进 | 3400ms | winFlow | 原样 |

**逐段时序对照（真实页每关演出窗合计，非 verify 提速）**：
| 段 | v1（dch1/dch3） | r34（dch1/dch3） |
| 读题 | 5×2940=14700 | 1×2940=2940（**-11760**） |
| 复述+right | 5×(estMs~10400+3150)≈67750 | dch1 5×(8148+3150)=56490（**-11260**）；dch3 5×(estMs~10700+3150)≈69250（+1500，5 帧句长成本） |
| 飞入/晃动窗 | 15×560+错点×1000 | 15×560 / (19-25)×560+错点×1000 |
| why 问句 | 0 | dch3/4 2×(3400+3700)=14200（新增判定窗） |
| 思考面（决策次数） | 15 放置 | 15/19-25 放置+10 干扰排除+2 因果二选一 |

v1 dch1 演出≈82s/关 → r34 dch1 ≈59s/关（**-28%**）；dch3 演出≈82s → ≈86s
（+5%，其中 why 14.2s 为新增判定窗非空演）——**思考占比**：v1≈15 决策/
82s 演出；r34 dch3≈27 决策/86s 演出（决策密度 +80%）。儿童时长为推断非
实测（§R12）。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest；23 键）

**A. 干扰帧/why 反馈 3 条**：
| key | 文案 |
| sto_w_out | 这张画不是这个故事里的哦 |
| sto_why_w | 再想一想，它为什么要排第一呀 |
| sto_why_right | 答对啦，先有了它，后面的故事才会一件一件发生 |

**B. 因果问句 12 条（sto_why_<story>，文案=「为什么要先{q0}呀？是因为{a}，还是因为{b}？你来选一选。」）**
（**q0 以 game-data.js 现值为准**——M1 修复（§R13）后 meal=「去洗手」、cate=「吃叶子」，
下表两格为修复前草案值留档，重注册以 game-data 为准+gen_clips 叠字断言兜底）：
| story | q0 | a（正确/选项卡文） | b（傻干扰/选项卡文） |
| wake | 睡醒起床 | 睡醒了才有精神 | 被子最暖和 |
| meal | 先去洗手 | 洗了手才干净 | 水龙头最好玩 |
| laundry | 放进洗衣机 | 脏衣服要先洗 | 洗衣机声音好听 |
| night | 洗香香澡 | 洗干净睡得香 | 泡泡最多 |
| seed | 把种子种下 | 种子先发芽 | 小猫饿了 |
| cate | 先吃叶子 | 吃饱才有力气结茧 | 叶子最绿 |
| rain | 乌云飘来 | 先有云才会下雨 | 云朵像棉花糖 |
| chick | 母鸡孵蛋 | 孵一孵小鸡才出来 | 蛋壳最圆 |
| sunwalk | 太阳升起 | 一天从早上开始 | 太阳最亮 |
| bird | 清晨唱歌 | 小鸟早上先醒来 | 歌声最好听 |
| meals | 早上吃饭 | 一天从早饭开始 | 面包最甜 |
| shadow | 早上影子长 | 太阳低影子就长 | 影子最黑 |

**C. 扩帧复述 8 条**（文案=recapOf 新格式，连接词 §R5；主线注册后按实长改
recapWaitOf 过渡窗——**注册时必须重量化（family H）**）：
| key | 文案（28-34 字，RECAP_DUR4/5 实测窗 7824-10944ms+300；estMs 窗列为本表草案期估值，注册后已按实长量化取代） |
| sto_recap4_seed | 先把种子种进土里，然后种子发芽了，接着长出小花苞，最后开出漂亮的花 |
| sto_recap4_cate | 先毛毛虫大口吃叶子，然后吐出细丝挂枝头，接着结成硬硬的茧，最后飞出小蝴蝶 |
| sto_recap4_rain | 先乌云飘来天变阴，然后大雨哗哗落下来，接着雨点落进池塘里，最后雨停了出彩虹 |
| sto_recap4_chick | 先母鸡妈妈在孵蛋，然后蛋壳裂开一道缝，接着小鸡钻出来了，最后跟着妈妈找虫子 |
| sto_recap5_sunwalk | 先早上太阳升起来，然后上午太阳爬高了，再中午太阳当头顶，接着下午太阳偏西了，最后傍晚太阳落下山 |
| sto_recap5_bird | 先清晨小鸟在唱歌，然后早上飞去找到虫，再中午妈妈喂宝宝，接着下午练习飞翔，最后晚上回巢睡觉 |
| sto_recap5_meals | 先早上吃面包牛奶，然后上午吃水果点心，再中午吃米饭青菜，接着下午吃块小饼干，最后晚上喝热粥 |
| sto_recap5_shadow | 先早上影子长长的，然后上午影子短一点，再中午影子最短了，接着下午影子变长了，最后傍晚影子最长 |

（最终 s[] 文案以 game-data.js 为准=上表逐字——**r34 审查 m1 勘误（09-21）**：草案期 6 行 8 处与
game-data 实文有出入（里/了/着/块/觉等口语衬字），已按 manifest 注册实文全量更正；clips 嵌入段过渡态注释在
build.py 声明「r34 注册 23 新键后 23→46」。）

## §R11 验收数字（Executor 自测门禁，2026-09-21 实测——主线独立复验为准）

**基线链**：改造前 `ac506fbdf53e9f17e61898e61d322841`（1156772 bytes，clips 23）
→ r34 改造后 `a79f0b668377f00f19204440520a1204`（build 输出 1170550 chars /
落盘 1190581 bytes，clips 23 不变——23 新键注册前）。

**七门禁全数字（全部真实执行）**：
1. build 双跑幂等：md5 `a79f0b668377f00f19204440520a1204` 两跑一致；
   家族契约子串全保（nextHint(lim-1)×2 / lastDir=Date.now()×2 /
   speakQuiz 行 / clearTimeout / r34 结构锚 13 条）。
2. VERIFY 双视口（_r34_verify_run.py）：1280×800 与 800×1180 均
   `VERIFY PASS 58/58`、0 pageerror（58 断言=①40关审计+dist ②封闭对账+flat0
   锚 ③库完整性 ④状态机+干扰/why 引擎 ⑤去泄序 ⑥时间词 ⑦教学 ⑧吞输入
   ⑨⑩冒烟 ⑪复述 ⑫布局 ⑬clips ⑭星级 ⑮预告 ⑯提速 ⑰干扰专项 ⑱why 专项）。
3. _selftest.py：**32/32 PASS**——含 Python 独立 mulberry32 镜像 40/40 关
   全字段对拍（story/frames{id,pos}/why.opts 逐题相同）；真实页教学链
   （watch→help，__stDemoR='right'）+ 真实 pointer 排故事0（help→solo）+
   autoSolve（taps=12，3★）+ celebrate + 写档（v1.0/story3.tutSeen/stars=3）；
   dch2 干扰帧真实页（5 卡在场/错点 miss+1 不放置/vlog sto_w_out；自有帧错=
   sto_hint；全 vlog 无 wFirst/wMid）；dch3 why 真实页（qi1 面板 2 选项卡文本=
   why.a/b+槽1 pulse；pointer 错选 miss+1 step 不推；对选 step 推进+
   sto_why_right；收尾 2★）；双视口×(flat0 3卡/flat12 6卡5槽/why 面板) 布局
   全过（卡 ≥96/槽 ≥64/overflowX=0，PIL 像素 stdev 14.0-20.2 非空白）；
   离线 0 http 请求；0 pageerror（分页分段+总账）。
4. verify_one_story3.py 原版（未动主线，取证跑）：**8/10 PASS**——FAIL 恰为
   §R7 预期过时腿 T2（帧形状 3 帧恒形）与 T4（方位反馈 wFirst/wMid 退休）；
   T7 复述（flat0 3 帧格式未变）实测仍 PASS；主驱动在 dch3/4 关 qi1/qi3
   why 相位提前 break（该腿无 chk 断言，不显 FAIL）——谱升级非回归。
5. _r34_verify_one_adapted.py（_src/ 适配副本）：**12/12 PASS**——T2 改按
   §R2 帧数表 3/4/5+干扰帧律、T4 改去泄序断言（sto_hint/sto_w_out+反断言）、
   主驱动补 why 相位 tapWhy(真因果) 40 关全推进、新增 T8 why 律；T1/T3/T5/
   T6a/T6b/T7/T10 逐字保持原版。
6. gate_common25.py story3 ST 23：**3/3 PASS**（G1 复跑 58/58；G2 demoR=
   right/tut=help/autoSolve taps=15/stars=3；G3 clips n=23 miss=[]）。
7. 谱对照（r34-baseline.json → r34-post.json，_src/ 归档）：
   - dch 40 关分布 {1:9, 2:11, 3:8, 4:12} 不变；dch 序/story 序逐关相同
     （rnd 消耗序保持=教学链与驱动兼容根因）；
   - flat0 谱逐字节 identical=True（FLAT0_ANCHOR 锚）；
   - 每题卡数：baseline 全 3 → post {3卡:45(dch1), 4卡:21(dch4×ch1故事),
     5卡:76(dch2 55+dch4×ch2 21), 6卡:58(dch3 40+dch4×ch3 18)}；
   - why 题=40（dch3 8关+dch4 12关 × qi{1,3}）；干扰帧=155（dch≥2 31关×5）。
   - 视觉取证 _shots/：why 面板特写（5槽全亮+槽1 pulse+「太阳最亮/一天从
     早上开始」2 选项卡无重叠截断）、flat12 6 卡两行板、dch2 5 卡板、双视口
     6 帧——VLM 复核无视觉缺陷。

## §R12 风险与未验证项（如实）

- **verify_one_story3.py 2 腿断言显性过时**（§R7 原判 4 腿，实测证据修正）：
  原版运行 8/10，显性 FAIL=T2/T4（谱升级非回归）；主驱动 why 相位提前 break
  与 T7 实为隐性/未触发——主线采信 _src/_r34_verify_one_adapted.py 或自行
  适配；本 agent 未动主线文件。
- **儿童时长为推断非实测**：思考密度由放置次数/干扰排除/因果决策承载；
  真机回归观察：4/5 帧题 miss 分布、干扰帧误点率（成员性判断难度）、
  why 问句不识读儿童（新键注册前静默=纯文字选项卡）的跳过行为。
- **23 新键注册前过渡态**：why 问句/干扰反馈/扩帧复述静默（vlog 仍记录，
  判定/推进不受影响——r32 同款）；主线注册后必须按 §R10-C 重量化复述窗。
- why 选项卡为文字（6-7 岁一年级上阅读面）——不识读儿童依赖问句音频匹配
  （注册后可用）；若真机发现阅读门槛过高，选项卡加配图=下轮扩展位。
- 同关重复故事的复述预演残留（§R1 维度二声明）——扩帧位+干扰帧缓解，
  未根治。
- estMs 对 4/5 帧复述窗的估值按 300ms/字+900：现有 12 条复述实测率
  229-324ms/字——估值覆盖上界除 shadow 类 24-34 字长句（324ms/字×34=
  11016 vs estMs 11100 边界），注册后按实长改窗即消除。
- _selftest/_r34 工具依赖 playwright+mutagen（本机已装）；主线复跑同环境。

## §R13 修复轮记录（2026-09-21 审查 M1+m2/m3/m4 处置，主线执行）

**触发**：反方审查 REPORT-REVIEW-r34（fatal0/major1/minor6）。M1=why 问句叠字
（meal/cate 两键 q0 自带前导「先」×whyClipOf 模板「为什么要先」→「先先」进交付音频，
manifest 与游戏侧一致故绑定契约未破、缺陷在文案本身）。

**修复**（一个 rebuild 循环覆盖）：
- M1：game-data.js q0「先去洗手」→「去洗手」、「先吃叶子」→「吃叶子」（q0 唯一消费点
  =whyClipOf，不渲染 UI）；删 2 mp3 重合成（gen_clips ok=2 fail=0，manifest 5190 不变）。
- m2 顺手：estMs 死代码删（全库零活引用，留删除说明注释）+game-main:295/game-data:524/
  game-verify:28 三处过时注释同步（46/实长表口径）。
- m3 顺手：structWhy 加 distractPool 断言（dch≠4 时干扰帧源故事须属本 dch 池——
  「同池视觉可混淆」难度属性回归即红）。
- m4+M1 防复发：verify 新增 ⑲ 收尾卫生单元（58→59）=退休键全 VLOG 复检（⑤ 时点后
  ⑨-⑱ 真实错点路径不再漏检）+whyClipOf 全 12 故事禁「先先」叠字；gen_clips 注册链
  同构 Python 断言（注册复发即崩）。
- m1/m5 纯 SPEC：§R10-C 表 6 行 8 处按 manifest 实文更正、§R7 文件名勘误、
  §R6/§R8 estMs/G3 勘误行。
- m6 登记：seed/sunwalk a 项因果感弱锚（真机误选率观察项，非本轮修）。

**修复后终版与门禁**：md5 **55baaffb28cdbbb09f64e7550c1b0121**（2778859 chars，clips 46）；
基线链 ac506fbd→a79f0b66（Executor 过渡）→d0b71b9d（主线注册 23 键）→55baaffb（修复轮）。
五门禁复跑全绿：VERIFY **59/59×2** 零 pageerror（⑲ 生效）/ _selftest **32/32** /
verify_one_story3 **12/12×2** / gate story3 ST 46 **3/3**（G1 title=59/59·G2 3★·
G3 n=46 miss=[]）/ voice 对账（manifest 5190+两键新文案 mp3 尺寸正常）。

**§R13 补记（同日试玩 F1 处置）**：试玩 P2-F1=hearBtn 教学期穿透（门
`if(VERIFY||!cur||state.locked)` 缺 `state.demo`——sceneEl/rabbitBtn/replayBtn/stage
四处含 demo 门唯 hearBtn 漏；watch 期演示帧间隙 locked=false 时点喇叭播 sto_q 穿透，
10 连点命中 4 次）——一行修复（game-main.js hearBtn 门补 `|| state.demo` 与四门对齐），
滚链 **c34dbe6e2b7f0e64cb6d8785aa840c7b**（2778927 chars）。P3 三项：①救援两级措辞
已在本 §R4 显式化（顺手）②why 选项卡配图=下轮扩展位③5 帧复述 11s 听感=真机观察。
终链：ac506fbd→a79f0b66→d0b71b9d→55baaffb（M1 修复轮）→**c34dbe6e**（F1 修复，终版）。
