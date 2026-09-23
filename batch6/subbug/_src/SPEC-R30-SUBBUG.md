# SPEC-R30-SUBBUG · 减法捕虫难度加深改造（r30，2026-09-21）

依据：AUDIT-67 行20 🟡 判定「实测 14/28s；**flat0=5 以内减法 14s 过快**；**点虫数剩支架
让孩子全程绕过心算**（"认知空心"典型案例）」；行66 建议「**ch3 起撤点虫数数辅助（强制心算）
或干扰虫提前；加两步加减混合题**」。校准：b6 段标称 6-7 岁一年级上，宁难勿易——r15-r29
同口径。本文件为 subbug 的 r30 难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH6 §3 冲突处
以本文件为准（r28/r29 同款声明）。

## §R1 改造总纲（审计三建议全承接 + 支架渐撤三段式）

玩法框架（叶子撒点小虫/放飞动画+角标/重新飞/3 数字大按钮/星级救援/教学 看→帮→独）与
教学链零改动；改造对象=**心算绕过面的拔除**（交互时序反转）+ 章谱结构 + 新题型（两步
加减混合）。核心设计张力与解法：

- **张力**：点虫放飞是本款核心玩法演出（放飞动画=兴趣锚），但「飞走 m 只→数剩余」让
  孩子全程零心算通关（审计根因）。任何"答前标记/飞走 m 只"的交互都会留下可数的余集
  ——**强制心算的唯一通路 = 答案先行**。
- **解法=支架渐撤三段式（先答后飞 / answer-then-fly）**：
  - **ch1 支架教学章**：全套保留（点虫放飞→角标计数→飞满呼吸→数剩余→选答案）。减法=
    拿走的概念教学场所+本款交互教学（教学链 看→帮→独 零改动，flat0 恒一步题可教学）。
    域 5 以内→**8 以内**（n 4-8，超出直观感数域 subitizing 4-5，8-3 也要逐个点数起步）。
  - **ch2-4 盲飞章**：答案按钮即刻开放，**答前点虫=摆动提示**（不走引擎、不计数、
    零惩罚；每题首次点虫播 calc「先算一算，还剩几只」引导不识字孩子）。必须先心算
    n-m（一步题）/n±b±c（两步题）选出答案。**答对后 autoFly 验证演出**：按题面把
    m 只绿虫放飞（角标 1..M 递增、剩余虫呼吸高亮）——**场上剩的虫数=孩子刚选的答案**，
    演出即验算（predict-then-verify，CPA 具象-抽象渐进的正序：抽象先行、具象验证），
    兴趣锚保留且升级为「揭晓时刻」。放飞动画不再是绕过心算的工具，而是心算的奖赏。
  - **支架救援（错后才给，miss≥2 解锁）**：连错 2 次说明心算未果——一步题恢复点虫
    放飞全套（与 ch1 同构）；两步题自动演示整个故事（先放 b 再飞来 c / 反序），孩子数
    剩余得答案，「重新飞」=重演。**盲飞章正确项 pulse 延至 miss≥3**（先给工具再泄答案，
    救援升级阶梯：错 1 次→纠错语音；错 2 次→支架工具；错 3 次→pulse 答案）。
- **维度二·ch4 一步题选择性计数（承接"只数绿虫"+n 播报撤除）**：盲飞章若语音播报 n
  则瓢虫沦为纯装饰（认知空心反向）。ch4 一步题 **n 不播报**——题面链「数一数绿色的
  小虫，飞走了 m 只，还剩几只？」，孩子须在 2-4 只红瓢虫干扰中**选择性计数**自得 n
  再心算 n-m（选择性计数+减法复合技能）。域 12-17→**9-14**（n 从免费变自得，总难度
  上调故计数负荷量适度回收；场上动物 11-18 只仍在 D=94 撒点安全域）。
- **维度三·两步加减混合 dual（audit"加两步加减混合题"）**：dch4 固定槽 qi1/qi3 各
  一题（每关恒 2，40 关 20 题）。**A=先减后加**（叶上 n 只→飞走 b→又飞来 c→还剩
  n-b+c）、**B=先加后减**（飞来 b→又飞走 c→n+b-c）。人教版一年级上第六单元（6-10
  加减）即有**连加连减、加减混合**专课——两步混合是一上正主而非超前。域 n 10-15、
  A:b 2-6/c 2-4、B:b 2-4/c 2-6，**两步中至少一步跨十**（强制进/退位心理线），
  答案 6-17。答对演出按型重演两步（A 先放后飞来/B 先飞来后放），故事结构可视化。
  **干扰项={中间态 s, 答案±1 定值}**（A 恒 answer+1、B 恒 answer-1）：s=第一步结果=
  经典"忘第二步"错误捕获器（错选 s 的孩子第一步对第二步漏——诊断性反馈）；两型互补
  使**答案恒非极值**（A:s<answer<answer+1、B:answer-1<answer<s），"选最大/最小"
  启发式对两型各失效一半，位置仍洗牌（"选中位值"需先完成三数比较=真数感劳动）。
- **两步范式纪律（r24/r25）不适用论证**：r24 countdual 是"一题两问两步作答"（两判定
  点、'half' 中间态、相位判定）；本款 dual 是"**听题心算两步、作答一次**"（单判定
  点），无部分正确中间态→'half'/相位机/逐相救援不适用（r25 M2 无对象）；两步结构由
  答后演出与错后演示承载（教学面而非判定面）。lastAct 纪律照常核对（§R4）。
- 一步题干扰项规则原样（±1/±2 互异 >0 ≠答案，答案 0 时 {1,2}，答案>0 绝不给 0——§0.17）。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题全不动）

| 章 | 章名（不变） | 形态 | 值域 | 模式/特殊 | 相对 r30 前 |
| --- | --- | --- | --- | --- | --- |
| 1 | 飞走啦 | 全一步题 | **n 4-8**（原 2-5），m 1..n-1 剩余 ≥1 | **支架章**（点虫放飞全套） | 值域 5 以内→8 以内 |
| 2 | 数到十 | 全一步题 | n 6-10（不变），剩余 ≥1 | **盲飞**（n 播报） | 交互反转：先答后飞 |
| 3 | 跨十减法 | 全一步题 | n 12-20（不变），qi0/qi3 跨十、qi2 全飞走答案 0 | **盲飞** | 交互反转：先答后飞 |
| 4 | 只数绿虫 | 一步题×3（qi0/2/4）+ **dual×2**（qi1=A、qi3=B） | 一步 **n 9-14**（原 12-17）+瓢虫 2-4；dual n 10-15 | 一步题 **n 不播报**（数绿虫自得）；dual n 播报、无瓢虫 | 域收窄但 n 变自得；+两步×2/关 |

- 章名零改动；**章末预告 hint 改 2 处（谱变更显式声明，r27-r29 范式）**：ch1
  「这次先算一算，答案对了小虫才飞走」（预告 ch2 盲飞规则——旧预告"数到十再算一算"
  对新谱失准）、ch4「飞走又飞来，两步算一算」（预告 ch4 两步题……注：ch4 的 hint 在
  通关 ch3 后展示、预告的就是 ch4 自身内容）；ch2/ch3 hint 与 GEN_HINTS 四条零改动
  （对新谱仍贴切）。
- **锚点（结构性）**：flat0 恒 dch1 一步支架题（教学链 看→帮→独 原样可演示：flat0
  q0 = n7-m3，演示放飞 3 只）；CH_LEN=5、STATIC_LEVELS=20、种子通道 mulberry32
  (flat×7919+13)、星级、存档语义全不动。
- 生成关（flat≥20）循环节奏与静态一致（20-24=dch1、25-29=dch2、30-34=dch3、35-39=dch4）。

## §R3 新规则族生成律（确定性通道不变，verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)，同 flat 永远同关；genLevel 签名不变。
- CANDS 一步题池按新 CHAPTERS 域离线枚举（dch1 n 4-8 / dch4 n 9-14），dch3 模式
  （qi0/qi3 跨十、qi2 全飞走）原样。
- **CANDS_DUAL 离线池**（枚举序 n→b→c，每 (n,b,c) 先试 B 后试 A——与 pycheck 同构）：
  - A：n 10-15、b 2-6、c 2-4、n-b≥5、跨十=((b%10)>(n%10)) 或 (((n-b)%10)+c>9)；
    s=n-b、answer=s+c（6-17）；
  - B：n 10-14（n+b≤18 约束生效）、b 2-4、c 2-6、c≠b（answer≠n）、answer=n+b-c≥6、
    跨十=((n%10)+(b%10)>9) 或 ((c%10)>((n+b)%10))；s=n+b。
  - 池实测 A=57 组、B=19 组（B 的跨十实际由退位条件承载：n%10≤5、b≤4 → 进位条件
    恒假，退位条件 (c%10)>(n+b)%10 主导筛选——池非空且答案值 ≥2 种，lastAns 过滤恒可行）。
- **genOne(dch,qi)**：dch4 且 qi∈{1,3} → genDual(qi===1?'A':'B')（固定槽=每关 A/B
  各 1 的确定性保证，r24 固定谱先例）；其余走原一步题生成（wantCross/wantZero/lastAns
  过滤+distractorsOf）。dual 的 **m=飞走数**（A:b/B:c）、**flyIn=飞来数**（A:c/B:b）
  ——engTapBug/engRefly 按 m 语义原样可用（驱动/救援不改引擎）。
- genDual rnd 消耗序（pycheck 逐位同构）：池选 1 次 → n 只虫装饰×4 → 飞来虫装饰×4 →
  选项洗牌 shuffled([answer, s, d2])，d2=A?answer+1:answer-1。
- **structOk(q) 扩展 dual 分支**：公式自洽（A: answer=n-b+c∧s=n-b∧m=b∧flyIn=c；
  B: answer=n+b-c∧s=n+b∧m=c∧flyIn=b）+ 干扰项恒含 {s, d2} + 全互异正值。
- 分布护栏精确值（确定性谱，SPEC 断言=推导值）：40 关 200 题 **dual=20（A=10、B=10）**、
  一步题=180（含 ch3 全飞走答案 0 题 10、跨十 ≥2/关）；答案位分布实测 [77,60,63]
  （三位置均出现、首位 <60%）。
- 四方口径同步：game-core.js（引擎）/ game-verify.js（规则断言独立复算）/
  _selftest.py（真实页点击）/ _r30_pycheck.py（Python 全量独立实现）。

## §R4 机制与救援（lastAct 纪律核对，r24 M1+r25 M2）

- **新增 lastAct 触点两处**：①uiTapBug 盲飞 inert 分支（答前点虫=用户探索行为，刷
  lastAct——救援钟不应在孩子活跃尝试时打断）；②uiReFly dual 分支（重演指令）。全部
  覆盖用户主动路径。
- **autoFly/demoDual 不刷 lastAct**（系统演出，非用户行动）：救援 20s 门在 autoFly 期间
  被 state.locked 拦（right 窗全程 locked）；unlockAssist 由 wrong 路径触发——该路径
  入口已刷 lastAct（r25 M2 同型：解锁面伴随的用户行动已刷新救援钟），650ms 后的
  demoDual 系统演出不需重复刷。
- **r24 M1（救援饿死）核对**：救援=单层 20s 语音（盲飞答前 calc/解锁后 hint，重播后
  lastAct 重置=每 20s 重复直至行动），无分层链无饿死面。盲飞路由：hintVoice()=
  dch>1 且未解锁 → calc「先算一算，还剩几只」；否则 hint「数一数，还剩几只」（解锁后
  可数剩，语义成立）——兔兔按钮（sayP 门原样）/点空叶（10s 节流）/20s 救援三处共用。
- **r25 M2 不适用论证**：dual 单判定点无部分正确中间态（§R1）；盲飞章 wrong 全路径
  （灰掉错项、miss 计数、解锁、pulse）入口统一刷 lastAct。
- **救援升级阶梯（盲飞章）**：错 1 次=sayW（未解锁播 calc/已解锁播 sub_wrong，10s 节流
  原样）；错 2 次=unlockAssist（一步题恢复放飞+两步题 650ms 后自动演示一遍故事）；
  错 3 次=pulse 正确项（支架章维持原 miss≥2）。星级口径不动：0 retry=3★/≤2=2★/else 1★，
  永不 0 星；盲飞直答路径 0 重试 3★、经救援通关 2★——难度真实计入。
- 答前点虫每题首次播 calc（q._calcSaid，与瓢虫首点 lady 同范式）；章 4 首点瓢虫 lady
  语音原样；大 m 放飞过半 cheer（m≥12，现仅救援态/答后演出可达——autoFly 不判 half，
  保留 manual 路径触发）。
- **autoFly 验证演出**（答对后，盲飞章）：一步题逐只放飞 m（170ms×SPEED 间隔，角标
  1..M，chimeM，剩余呼吸）；dual A 先放 b→420ms→飞来 c（新虫从叶上俯冲落位 an-in
  0.62s，落点=现有动物拒绝采样独立流 mulberry32(seed+31)）；B 反序。入场先清 .infly
  残留（演示→验证不叠虫）。窗口内 locked、
  身份守卫（cur!==run 双检：880ms 窗后与 autoFly 后各一次——r29 反方审查 M3 同型）。
  window.__autoFlyN 计数=verify/selftest 演出取证锚。

### §R4b r30 修复轮（独立审查 3 major，2026-09-21 第二轮——同族=演出窗与用户快速行动的重入交叉）

- **M1 演出互斥**：demoDual 重构为同步外壳+async IIFE，promise 挂 `q._demoP`（演示中
  重按返回在跑 promise 不叠演）；uiPick right 分支 autoFly 前若 `q._demoBusy && q._demoP`
  则 `await q._demoP`（promise 链接等待真实收尾，**非 sleep 硬等总长**——SPEED 提速下硬等
  必错），等待后复检身份守卫。修复前：救援演示中点对答案 → autoFly 与 demoDual 并发，两
  async 各自清 .infly 后各自 append → 场上飞来虫 2c 只、「场上剩=答案」失效。
- **M2 dual 题解锁后点虫不走引擎**：uiTapBug 盲飞 inert 条件改 `dch>1 && !demo &&
  (type==='dual' || !_assist)`——dual 恒 inert 摆动（引擎放飞会把场上剩钉在中间态 s（A 型）
  /选项外值（B 型），把孩子引向错误答案；两步题故事重演入口=「重新飞」）；一步题解锁后
  走引擎放飞（剩=answer 语义正确）保留。
- **M3 重入防护双面**：①autoFly/flyInBugs 加 run 身份守卫（autoFly(q,run) 逐 await 后
  `cur!==run` 即 return；demoDual 开头捕获 run 传入）——重玩/任何重建关后旧续体不再以
  bugEl(i) 全局匹配污染新关 DOM；②replayBtn 加 `(state.locked && !state.won)` 门（对照
  hearBtn）——答对演出窗/教学窗内重玩被拦（关卡未重建），won 后（日末关闭停留已通关关）
  重玩既有通路保留。
- **minor1 判别力断言（结构性发现）**：verify 冒烟 C + _selftest 2d 补「miss3 尝试=重按
  已灰错项」断言（engPick 返 'again' 不涨 miss、retries 不变、正确项仍不 pulse）。核出的
  结构性事实：**3 选项题面（1 答案+2 错项）单题 miss 极限=2，「盲飞 pulse 延至 miss≥3」
  为不可达死分支**——已选错项重按返 again 不计 miss，第三错不存在。设计层取舍留主线定夺
  （改阈值=改玩法机制，超出本轮交互守卫面授权）；断言守住"again 若被计 miss 则 pulse 出现"
  的回归面（阈值误写或 again 计数的任何改动都会被抓住）。
- 修复面铁律遵守：game-core.js/game-data.js/clips 零改动（修复后重提取 40 关谱与修复前
  r30-post.json **逐字节一致** + pycheck 40/40 复算全绿）；修复全在 game-main.js 交互守卫
  面 + game-verify.js/_selftest.py 断言面。

## §R5 引擎与钩子（向后兼容）

- 引擎新增纯函数 genDual + CANDS_DUAL 池；genOne 首 3 行分派 dual；structOk 增 type
  分支。engTapBug/engRefly/engPick/engStars/engWon **逐行不动**（dual 的 m=飞走数
  语义复用）；mulberry32/shuffled/ri 逐位原样（pycheck 40/40 为证）。
- 渲染层：renderChip 分型分章（dual 双操作数大字+两步子行、ch4 一步「先数绿色的小虫，
  再算一算」、ch2/3「先算一算，再选出答案」、ch1 原样；dual 不渲 #flycount——k/M 单
  操作数语义对双步失真，renderFlycount null 守卫原样）；新增 autoFly/flyBug/flyInPts/
  flyInBugs/demoDual/unlockAssist/hintVoice；head.html 增 .animal.infly 俯冲动画；
  其余渲染（撒点/角标/呼吸/摆动/幽灵手指）零改动。
- **SUB 钩子**：currentLevel 原样；quiz getter 增 mode('scaffold'/'blind')/assist/
  form/b/c/s/flyIn 字段（既有字段零变化——distractors 契约原样）；tapBug/tapLady/
  recount/pick 签名原样（盲飞答前 tapBug 返 false=未放飞，语义兼容）；autoSolve 分型
  （支架章放飞后选/盲飞章直选——guard 40 不变）；tutorial getter 原样。
- **verify_one_subbug.py（主线腿）零适配**：①verify title ②flat0 真实放飞+选答案通关
  （ch1 支架保留，驱动协议 flyCount<m→点虫 原样命中）③viewport flat15（ch4 一步题
  虫 78px/答案 ≥96/中心距 ≥90——D/size 不变）④离线 ⑤截图 ⑥钩子（tapBug/recount/
  pick/autoSolve 全在）⑦0 pageerror ⑧教学吞输入（flat0 演示期 locked 原样）⑨clips
  （sub_tut_watch/turn/hint 不动）⑩flat1 答错零惩罚+首错不 pulse（ch1 阈 miss≥2 原样）
  ⑪flat15 瓢虫不计数（quiz0=一步题瓢虫 2-4 在场）——逐腿核对全兼容。

## §R6 基线证据（双证据 + 谱变更显式声明，r27-r29 范式；工具随款归档本目录）

- **证据①（前后产物对照）**：改造前 index.html（md5 7096afc1f18190abb6beb3e8933d6a44，
  613643 chars）提取 40 关 quizzes JSON=r30-baseline.json；改造后（md5 e7cd71b7…）=
  r30-post.json（提取器 _r30_extract.py，归档本目录）。
  - **保留（逐字节，机检）**：**ch2+ch3 全部 20/40 关**（flats 5-14、25-34）逐字节一致
    ——两章生成律零改动（域/模式/rnd 消耗全同），改造仅翻转交互时序（盲飞）——
    pycheck `byte-identical levels = 20/40` 机检为证。
  - **保留（结构性）**：flat0 首题恒 dch1 一步支架题（教学链零改动机检前提）；CH_LEN=5/
    200 题/确定性（同 flat 双跑一致）。
  - **变更（预期）**：ch1 全部 10 关（域 2-5→4-8 改 rnd 消耗流）、ch4 全部 10 关
    （域 12-17→9-14+qi1/qi3 换 dual——槽位换型改 rnd 消耗流）。
- **证据②（Python 独立复算）**：_r30_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r27-r29 同源副本），与页内提取 40 关全量对拍
  **PYCHECK 40/40 levels identical**（kinds sub=180/dualA=10/dualB=10 同拍）。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8 ①：dual 槽位/域/公式/跨十/
  干扰项独立复算+每关 A=B=1+全局 20/10/10）+ structOk 扩展。
- **证据④（真实页真实点击）**：_selftest 2c（盲飞+瓢虫+dual 中间态错选+答对演出）/
  2d（盲飞 inert→miss1→miss2 解锁→支架放飞/重飞→通关）；真页截图取证
  _shots/r30-blind-ch2.png（盲飞题面+calc 子行）/r30-dual-ch4.png（两步双操作数题面）/
  r30-dual-autofly.png（答后飞来瞬间）/r30-assist-ch2.png（救援解锁放飞态）——
  PIL stdev 27-29 全非空白。

## §R7 存档与兼容

无档结构变化：档键 kidsgame_subbug、levels 'ch-lv'、CH_LEN=5、STATIC_LEVELS=20、日历
语义、sv.sub.tutSeen 全不动；无新增落档字段（mode/assist/_calcSaid/dual 各域均为
运行态）。旧档已通关星级与新代码无矛盾态——新谱下重玩 ch1/ch4 关题面刷新但星级/通关
语义不变，ch2/ch3 关题面逐字节不变（r20-r29 同款声明）。主线 verify_one_subbug.py
零适配（§R5 逐腿核对）。

## §R8 verify/_selftest/build 适配清单

- **game-verify.js**：① 审计循环 type 分支——dual（dch4 槽位 qi1=A/qi3=B、n 10-15、
  b/c 域、s/answer 公式、双步跨十复算、干扰项含 {s,answer±1 定值}、无瓢虫、每关
  A=B=1）+ 一步题新域（dch1 4-8、dch4 9-14）+ 槽位互补断言（dch4 qi1/3 非一步题）；
  全局 dual=20/A=10/B=10 汇总 units.dual 并入 title 终判；② 放飞单元 flat0 原样；
  ③ 冒烟 A 原样 + 冒烟 B（flat15 盲飞：答前点虫不计数+瓢虫不计数+autoSolve 直选
  3★+autoFly=5）+ **新增冒烟 C**（flat5 盲飞救援链：inert→miss1 不解锁不 pulse→
  miss2 解锁不 pulse→支架放飞角标→重新飞清零→答对 autoFly=1→通关 2★）；
  ④ 布局腿 flats [10,15]→[0,10,15]（ch1 新域 8 只×双视口=6 sims）+ scatter dense
  增 (8,D=150) 横/竖两档；⑤ dist 原样。总单元 46→**47**。
- **_selftest.py**：补 MUTE 静音双保险（r19 红线，r28 定稿 function 版照抄+种档
  sound:false/tts:false/vol:0）；play_level/answer_current 分型（支架放飞/盲飞直答，
  autoFly 窗自适应轮询 step+chip 重渲——.opt.right 清空=新题面已上屏，时序洞修复
  记录：模型 step++ 早于 renderQuiz，须连 DOM 一起等）；2a/2b 原样（ch1 支架+教学）；
  2c 重写（盲飞+瓢虫+dual 真实链：中间态 s 错选零惩罚不 pulse+**miss2 解锁→650ms 自动
  演示故事→重按"重新飞"重演**（af 计数基线在演示 armed 前取——时序坑记录）+答对 autoFly
  验证）；**新增 2d**（flat5 盲飞救援全链真实点击：inert→两级 miss→解锁→放飞/重飞→
  通关→flat6→autoFlyN=5）；viewport 腿原样（flat10 ch3 密集档）。**实测 61/61 PASS**（§R11）。
- **build.py**：新增硬性检查 4（r30 结构锚）：engine CANDS_DUAL/genDual/flyIn/
  type:'dual'、data 6 新键+新域常数（nMin:4/nMax:8/nMin:9/nMax:14）、main autoFly/
  unlockAssist/demoDual/flyInBugs/__autoFlyN/hintVoice/先算一算、verify dualA/dualTotal/
  __autoFlyN/smokes.flat5/700004。
- **主线侧（声明不实施）**：①voice/gen_clips.py subbug 段注册 6 新键（§R10）+实长
  回填；②verify_one_subbug.py 零适配（§R5/§R7）；③gate 若按 verify 单元数对账需
  46→47。

## §R9 时序参数实测口径（r23 P2-1 红线：逐调用点对照实现核）

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 答对停留窗 | 880ms×SPEED | uiPick right/done 第一段 await | 原样 |
| **autoFly 逐只间隔** | 170ms×SPEED | autoFly 放飞/飞来循环 await | 新增 |
| **autoFly 两步间停顿** | 420ms×SPEED | autoFly dual 分支（放完 b 再飞来 c 前） | 新增 |
| **autoFly 尾停顿** | 520ms×SPEED | autoFly 末尾（呼吸亮相后） | 新增 |
| 放飞消失 | 780ms×SPEED setTimeout | flyBug/.fly→.gone | 原值复用 |
| **飞来动画** | 0.62s CSS（an-in，不 await；逐只 170ms 节流） | head.html .animal.infly | 新增 |
| 答错晃动窗 | 520ms×SPEED | uiPick wrong await | 原样 |
| **解锁演示延迟** | 650ms setTimeout | unlockAssist→demoDual | 新增 |
| 教学演示节奏 | 700/900/320/560/600/900/280ms×SPEED | tutorialWatch 各段 await | 原样（flat0 支架题） |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 20000ms 无操作 | 同上（hintVoice 路由后 sayR+lastAct 重置） | 原样（键分路由） |
| 教学 help 重演示 | 5000ms | 同上 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样（盲飞未解锁换 calc 键） |
| 空叶提示节流 | 10000ms | field pointerdown 空白分支 | 原样（键分路由） |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样 |

r30 新增时序面=autoFly 演出族（170/420/520/0.62s/650ms）——全部演出窗口参数，
SPEED 缩放联动（verify 页 0.12 提速实测 47/47 通过）。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 6 键**（前缀 sub_ 已 grep gen_clips.py 核零占用：现有 sub_tut_watch/
sub_tut_turn/sub_hint/sub_wrong/sub_lady/sub_cheer/sub_refly/sub_s_leaf/sub_s_fly/
sub_s_left + sub_n_0..20 共 31 键）：

| key | 文案（clip 合成文本） | 用途 |
| --- | --- | --- |
| sub_calc | 先算一算，还剩几只 | 盲飞章引导：答前点虫首次提示/兔兔/空叶/20s 救援/盲飞未解锁纠错 |
| sub_s_green | 数一数绿色的小虫， | ch4 一步题面链首段（n 不播报） |
| sub_s_fly2 | 飞走了 | ch4 一步题面链（区别于 sub_s_fly「只小虫，飞走了」——ch4 无前置数字段） |
| sub_s_come | 只小虫，飞来了 | dual B 题面链首步（先加） |
| sub_s_andcome | 只，又飞来了 | dual A 题面链次步 |
| sub_s_andfly | 只，又飞走了 | dual B 题面链次步 |

- 拼句段键复用已注册 sub_n_0..20（数字段全量有 clip）。ch2/ch3/ch1 链=原 5 段链零变化。
- UI 既有键零改动（含救援 hint——解锁后盲飞章仍用 sub_hint，语义成立）。
- **注册前过渡态（T46 阶段3 后无系统 TTS 兜底——core speak()=静默+console.warn）**：
  ch4 一步/dual 题面链缺段→sayQ 兜底 KIDS.speak(qSpeech)=静默；视觉/交互/演出完整
  不受影响（selftest 2c/2d 在缺 clip 态全绿为证）；主线注册后自动换真 clip。
- gen_clips 注册建议格式（T46 行，沿 sub_s_* 先例）：
  `T46('sub_calc', '先算一算，还剩几只', 'subbug')` 等六行（文案与 game-data.js
  VOICE.text 一字一致）。

## §R11 验收数字（Executor 自测三门禁，2026-09-21 实测）

**基线链**：改造前 `7096afc1f18190abb6beb3e8933d6a44`（613643 chars）→ r30 改造后
  `e7cd71b7b7381a2da1112cf8b9ee898e`（630804 chars）→ 主线 clips 40 键注册后
  `29817e5c9e68bad520a5fe106cb0944a` → **r30 修复轮（§R4b）后现行基线
  `9b3ce3948d01484d5ea35674dfb2cb55`（745125 chars，clips 40 条不变）**。

### 第一轮（r30 改造，基线 e7cd71b7）

①build 连跑两次 md5 一致（e7cd71b7）；②VERIFY 双视口 47/47；③_selftest 61/61；
pycheck 40/40；ch2+ch3 全部 20/40 关逐字节保留；真页取证 _shots/r30-*.png 四张
（PIL stdev 27-29）。

### 第二轮（r30 修复轮，§R4b 三 major，基线 9b3ce394，2026-09-21 实测）

①build 连跑两次 md5 一致：`9b3ce3948d01484d5ea35674dfb2cb55`（745125 chars）
②VERIFY 双视口（1280×800+800×1180）：**47/47 PASS ×2**，layoutOk、dist [77,60,63]、
  units.dual=20（A10/B10）、冒烟 C 含新 miss3 断言、**0 pageerror**
③_selftest **62/62 PASS**（61 原有+2d 新增 miss3 尝试断言；MUTE 双保险+0 pageerror+
  完全离线+双 viewport+截图非空白 stdev 21.4/20.7）
④主线腿 verify_one_subbug **12/12 PASS**（clips=40 不变）
⑤谱零改动实证：修复后重提取 r30-post.json 与修复前**逐字节一致**（diff 空）+
  pycheck **40/40 levels identical**（sub180/dualA10/dualB10，ch2+ch3 20/40 保留复核）
⑥三复现路径 `_r30_repro_fix.py`（归档本目录，可复跑）**10/10 PASS**：
  a)M1 演出中点对→autoFly 恰 2 场、飞来虫=4（flyIn，非 2c）、终态场上剩=10=answer；
  b)M2 解锁后 tapBug 返 false、场上 [animals/fly/badge/flyCount] 零变化、虫 wig 摆动；
  c)M3 演出窗内真实点重玩被拦（step/retries/flat=[1,0,15] 未重建）、autoFly 中强制重建关
  身份守卫丢弃旧续体（新关 badge/gone/fly/infly 全 0）、won 后重玩放行（step 归 0）。

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：机器口径被 autoFly 演出窗（170ms×m+940ms/题）主导；
  难度提升的真实度量=心算绕过面拔除（盲飞章无任何数余集通路）+ch4 选择性计数
  （11-18 只动物中数 9-14 绿）+两步混合（中间态保持+双跨十）。儿童实际估 ch1
  40-80s、ch2/3 60-120s、ch4 100-180s（推断值）；真机回归观察项：ch4 数绿虫的
  计数错误率、dual 题选 s（中间态）的比例（诊断价值本身）、盲飞章 miss≥2 救援
  触发率、答前点虫摆动提示是否足够引导（calc 语音每题一次的频度）。
- 6 新键注册前 ch4 一步/dual 题面语音静默（过渡态，§R10）；主线注册后消失。
- B 型池 19 组小于 A 型 57 组（B 的进位条件在 n≤15/b≤4 域恒假、由退位条件独扛）——
  40 关 B=10 题分布正常（pycheck/verify 双侧对拍一致），池小但答案多样性足够；
  若后续想扩 B 池需把 n 域上探 16+（会引入 n+b>18 边界，本轮回避）。
- 盲飞章答前点虫返回 false——若主线后续脚本沿用「flyCount<m 则点虫」协议跑 ch2-4
  会死循环；现 verify_one_subbug ② 仅跑 flat0（ch1 支架）无此面（§R5 已核），主线
  新增盲飞章腿时须走 SUB.quiz.mode 分型（selftest play_level 范式可抄）。
- autoFly 期间窗口 resize：placeAnimals 重撒点，autoFly 旧元素引用被替换（守卫
  if(el) 静默跳过，动画可能不完整）——极端边缘，无功能性后果（模型态已推进）。
- **「盲飞 pulse 延至 miss≥3」为结构性不可达死分支**（r30 修复轮核出，§R4b minor1）：
  3 选项题面错项仅 2 个，engPick 对已灰项返 'again' 不计 miss → 单题 miss 极限=2，
  `q._miss >= 3` 永不触发。当前行为等价于「盲飞章永不 pulse」（比设计阶梯少一级泄答案，
  对难度无负面影响——不泄答案更难）；若要阶梯第三级落地需改玩法机制（pulse 阈值改
  「错项全灰」或 again 计 miss），留主线定夺。判别力断言已就位（verify 冒烟 C+2d）。
- verify_one_subbug.py（主线腿）已于 r30 修复轮复跑 **12/12 PASS**（§R11 第二轮④）；
  修复轮改动（§R4b）的审查/试玩独立复验待派（agent 不自验铁律）。
