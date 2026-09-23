# SPEC-BATCH13 · 7-8 岁三款（零钱管家 / 应用题剧场 / 坐标寻宝）契约 v1（2026-09-07）

对象：7-8 岁（一二年级：20 以内加减熟练、乘法口诀在学、人民币认识、方向与位置初步）。目录 `batch13/money|wordprob|grid/`。
结构照 batch1-12：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch12/divide/_src/（发放/点选双阶段款+题面 queue 拼接）、batch12/fraction/_src/（三题型轮换+灰化款）、batch3/math/_src/（点选答题+干扰设计+verify 全量审计）、batch10/simon/_src/（方向键输入款）、batch6/subbug/_src/（动画演出+点数角标）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-23 全承 batch12 原文 + 24-25 新增定版）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/**say**）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关（难度章随机 `flat<STATIC ? diffOfCh : ri(rnd,1,4)`，batch11 M1 定版）
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 **lim-1**（batch12 m6 定版：传 lim 在 lim%5==0 时预告跳章）
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + 豁免恰一次——灰化款传 `q._miss >= 2`；不灰化款必须 `=== 2`；四选一及以上候选的灰化款也必须 `=== 2`；**两选一款 `>= 1`**（miss 封顶 1，batch12 m1 定版））+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）；tutorialWatch 内 `KIDS._save()` 必须 `|| { levels: {} }` 空档防御（batch12 m3）
7. **答错零惩罚**：晃动（灰化款=灰掉可重点、pointer-events:none；不灰化款=不灰可重点）；首错不 pulse 正确项（miss≥2 才高亮）；引擎 'again' 早退防御层
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s。**例外口径（审查 m4+试玩 P2 定版）**：重听题面卡/读题按钮重置（主动学习动作）；grid walk 合法移动重置（移动=推进的物理形态，含绕远探索）；grid 撞墙/出界=bump 探索，**不计 miss 不扣星**（与 money 放币/移币同口径——物理探索非答错）
8. **钩子 getter 返回拷贝非活引用**；禁死字段（字段必须可观测真值）
9. **触摸目标 ≥64px**；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn` 豁免
10. **对比度 WCAG**：正文文字 ≥3:1
11. **CSS transition 坑**：量测等 transition 结束或用纯数学
12. **core 家长门**：弹层类=.k-panel；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（缺 clip 整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠；结构化内容优先 HTML grid/flex
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）；教学/演出期点兔子/空白=pop+hop 轻反馈不静默；**演出期点黑板/主视觉区也给 pop**（batch12 m4：非键非按钮的一切可点区在 locked/won/demo 期 sfx('pop')）
17. **选项干扰项**：与答案相近（同相似组/错一属性/相邻序），互异；数值款禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **7-8 岁文字允许**：题面可出文字（一二年级识字量），但**核心指令仍须语音承载**（不依赖阅读能力）；关键数字/答案选项用大字
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现**：静置 14s 救援=重读题面 qSpeech + **答案视觉线索**——高亮类（breathe）持续循环在屏或 pulse 类改三连脉冲（0/520/1040ms 错峰），静音环境屏幕可感知；语音-only 救援不收
22. **吞输入期轻反馈**：watch/演出期真实点击被吞时给轻反馈（sfx('pop') 轻叮+等效视觉），返回值/状态不变
23. **题面句语音 clip 化**（batch11 真机反馈 2026-09-07 定版）：封闭库题面全组合建 clip（晓晓音色）；开放式数字题面走 queue 拼接 clip（times 的 tim_n_* 模式：数词 clip+短语 clip 拼句）；系统 TTS 仅留缺 clip 兜底，正常游玩不触达浏览器系统合成音；**答错纠错句（sayW wrong 文案）同为正常游玩高频路径，一律建 clip（batch12 m5 定版）——wrong 也不允许 key:null 系统TTS**
24. **wrong 句 clip 化**（23 的执行细则）：三款 VOICE.wrong 必须指向专属 clip（men_wrong/wor_wrong/gri_wrong），文案与 manifest 严格一致
25. **每游戏自建数词 clip 副本**（batch12 确证模式）：clips 按 games 注入，跨游戏不共享——men_n_*/wor_n_*/gri_n_* 各自合成，禁复用 div_n_/tim_n_*

## §1 money 零钱管家（人民币认知→凑钱/买两件/键盘找零；不灰化）—— r15 难度改造版（2026-09-16 真值现行）

> **r15 难度改造（2026-09-16，据 AUDIT-78:80 黄款定案）**：ch1 起步含 5 角、找零改**数字键盘输入**（去 3 选 1 答案卡）、新增**「买两件合计」**题型、**多币组合**（0.5/1/5/10 元混盘）。旧「ch2 凑钱 ≤20 元」题型与 options/answerIdx/tapAnswer 钩子随键盘化废弃。内部金额=半元整数（0.5 元=1）零浮点歧义。

**玩法**：小卖部小兔子掌柜场景。四题型（kind）：
- **凑钱 gather（ch1，起步含五角）**：商品价签卡+币托盘（点币入篮/点篮内币移除），合计实时大字（带角一律"X 元 5 角"格式禁小数连写）；点"给钱啦"提交——=价→庆祝；≠价→篮晃动零惩罚可调整
- **买两件 pair（ch2）**：两件商品价签（A+B），先算合计再凑币（同提交制）；首题热身=ch1 角价型
- **键盘找零 change（ch3）**：黑板"付了 X 元，买了 Y 元"（整元），数字键盘（3×4：1-9+末行[清空,0,退格]）输入"找回几元"，"算好啦"确认判定
- **键盘找零带角 jiao（ch4）**：键盘+**5 角键 toggle**（金色，仅本章在场）；答案=元位数字+5 角键；首题热身=ch3 型

- **键盘交互契约（r15 定稿）**：判定只在确认（按键/退格/清空/5 角键=构造探索零惩罚）；元位数上限 2（第 3 位拒收+显示区轻闪不计数）；首位 0 替换（计算器惯例）；空输入确认=miss（与空篮提交同口径）；错确认=显示区晃动不灰化 520ms 防重入窗（窗内连点只记一次）
- 数值域（半元单位）：ch1 凑钱币 0.5/1/5 元，价池 角{2.5,3.5,5.5,6.5,7.5}+整{3,4,6,7,8}（qi0/2/4 角价=起步含五角）；ch2 两件各 2.5-9.5 元、合计 8-17 元（qi1/2 拆型无 10 元币 T∈15 档/qi3/4 含 10 元币 T∈10 档）；ch3 付 10/20 元、价 3-18 整元、差 2-17；ch4 付 10/20、价 X.5（X∈2-8）、付 10→差 1.5-7.5/付 20→差 11.5-17.5；生成关随机章参数（flat≥20 seed=mulberry32(flat\*7919+13)，dch=首抽 ri(rnd,1,4)，Python verify 独立复刻对账）
- 币盘组合数学：币 3-7 枚含基础分解+干扰 0-2 枚（生成即证明可凑，verify 独立 DP 复核）；**最少解币数上限（儿童工作记忆先验）：ch1 ≤4 / ch2 ≤5**；同关相邻价不同
- 每关首题热身：ch2/4 首题=ch1 角价型/ch3 型（warm 标记）
- 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0 星）
- 救援：凑钱期=可行性 DP 指币（加币/移除/提交钮任一可行目标 breathe）+重读题面；键盘期=**清→位→角→确认 阶梯**（非前缀输入→指清空键；元位未齐→指下一位正确数字；元位齐角错→指 5 角键；全对→指确认）；14s 静置触发，错确认/放币不重置
- sayW：flat<3 每错必播 / flat≥3 10s 节流 / `q.miss === 2` force 豁免恰一次；wrong=men_wrong clip
- **时长模型（r15 门禁，照 crd r12 范式）**：quizDur=max(ENTER 400+estMs(题面语音)+TAIL 300, DECIDE_MS[kind])+nInput×TAP 1500+CONFIRM 2000+ADV 880；DECIDE_MS={gather:12000,pair:15000,change:13000,jiao:16000}（nInput=凑币最少解币数/键盘键数含 5 角键）；estMs=`s.length*345+600` 四方字面同步（data 源+verify 独立副本+build 断言+Python verify_one 复算）；LEVEL_MIN_MS=40000——40 关 modeled 最低 **86900ms@flat10**（dch3 关全 1 位答案 5×17380，verify 精确防回漂）
- 钩子：`MN = { get currentLevel, get quiz(){ kind('gather'|'pair'|'change'|'jiao'), price, priceA, priceB, pay, coins[](币面值元), tray[], sum, digits, jiao, answer(元数值如 7.5), step, miss }, tapCoin(v), tapTray(i), tapOK(), tapKey(k), tapConfirm(), async autoSolve(), get tutorial, get rescues }`
- 语音（33 men=旧 30 一字不改+r15 新 3）：通用 men_tut_watch/men_tut_turn/men_hint/men_wrong；题面拼接=men_q_buy'买'+men_n_N（数词 1-20）+（角价 men_q_buy_j'元五角的东西，点出正好的钱'/整价 men_q_buy2'元的东西，点出正好的钱'）；pair 接续段=men_q_and'元的和'/men_q_and_j'元五角的和'；找零=men_q_pay'付了'+men_n+men_q_pay2'元，买'+men_n+（带角 men_q_jiao'元五角的东西，找回几元呀'/整元 men_q_pay3'元的东西，找回几元呀'）——尾句整条化防"元五角元"病句（审查 m2 先例）；r15 新 3 键=men_q_buy_j/men_q_and/men_q_and_j

## §2 wordprob 应用题剧场（图文应用题；点选款，不灰化）—— r13 难度改造版（2026-09-15 真值现行）

**玩法**：场景插画（SVG 简笔：公交车上下客/吃饼干/野餐/花园/分糖）+题面文字（大字逐词，3-4 句情景叙述）+语音读题（queue 拼接整句），点选答案卡（**4 选 1** 大数字卡=答案+干扰三元组）。
r13 升级（difficulty-audit/AUDIT-78:66 定案）：数值域升 **100 以内两步应用题**（先算中间量再算所问）；混入**多余条件**干扰题型；干扰卡改**「算得对但答非所问」**；题面加长 3-4 句。

- 章结构（难度章号 1-4；生成关随机章参数；每章模板 ≥2 轮换，相邻题模板互异）：
  - ch1 两步加减：bus2（as：车上有 a 人上来了 b 人又下去了 c 人→a+b-c）/cookie2（sa：有 a 块吃了 b 块又放 c 块→a-b+c）
  - ch2 乘加乘减：plate2（ma：a 盘每盘 b 个又拿来 c 个→a×b+c）/row2（ms：a 行每行 b 棵搬走 c 棵→a×b-c）（表内乘法域）
  - ch3 多余条件：busex（sad：a-b+c+d=座位数无关）/cookieex（sad：a-b+c+d=年龄无关）
  - ch4 综合：rowex（mad：a×b-c+d=蝴蝶只数无关）/candy2（sd：有 a 颗送老师 c 颗剩的平均分 b 人→(a-c)/b 整除域衔接 divide）
- 数值域（模板 dom 闭区间+form 约束；操作数全部 ≤35=wor_n_1..35 可读，中间量 ≤45，答案 ≤69，全部 100 以内）：
  bus1 a15-24/b13-20；bus2 a16-25/b9-16/c6-15（c≤a+b-8）；cookie2 a17-28/b6-16/c9-18（b≤a-8）；
  plate2 a3-5/b6-9/c10-24；row2 a4-5/b7-9/c10-26（c≤a×b-4）；busex a18-26/b5-12/c7-14/d20-30（b≤a-8）；
  cookieex a18-28/b6-15/c8-16/d6-9（b≤a-8）；rowex a4-5/b7-9/c10-24/d4-9（c≤a×b-4）；
  candy2 槽序[a,c,b]=b2-3/商5-8/c5-9/a=b×商+c∈15-33
- 每关首题热身=上一章主型：ch1 首题=bus1 单步 100 以内进位加桥接（kind one）；ch2/3/4 首题=上一章模板池（kind two/two/extra）
- 干扰三元组（r13 定案"算得对但答非所问"，防「算出唯一合理数即选」）：
  d1=两步中间量真值（as/sa 系=a±b 首步值/ma 系=a×b/sd=a-c；add=|a-b| 镜像，域保证 a≠b）；
  d2=次可算量（extra 型=多余数字 d 本身，撞值域内移位；two 型=符号错值 a+b+c/a-b-c/a×b∓c 等优先序）；
  d3=近误值（答案 ±2 优先回退 ±1/±3）；全部 >0、≠答案、互异；verify 独立复算 d1/d2 确为题面可算量真值（禁随机近误充当全部干扰）
- 反启发式锚：同数值跨题在正解集与干扰集双现 ≥5（verify 断言；防背答案策略）
- 时长模型（crd r12 范式）：每题 dur=max(voiceWin, DECIDE_MS[kind])+ADV_MS；voiceWin=ENTER 400+estMs(题面全文)+300；
  estMs=s.length*345+600（b25 定版四方字面同步）；DECIDE_MS={one:15000, two:18000, extra:19500}（7-8 岁两步心算推算，见 game-data 注释）；
  ADV_MS=880；**单关 modeled ≥40000 门禁**；40 关 modeled 最低=91400（dch1 关=one 热身+4×two），verify ⑭ 独立副本复算+逐关对账+每题 DECIDE≥voiceWin+全模板全域枚举先验验算
- 错答 clip 窗（契约 I）：wrongChainUntil=起播+4200（wor_wrong 10 字 estMs+150）救援 interval 让路，startLevel 重置
- 插画：每模板一幅 SVG 简笔（≥3 元素，暖色），题目数字不入画（防数元素代替运算——图示场景不呈现确切数量，孩子必须听/读题）
- 救援：重读题面+正确答案卡 breathe（正向选择款——发光落正确卡语义同向）；sayW 不灰化 `=== 2`；wrong=wor_wrong clip
- 钩子：`WP = { get currentLevel, get quiz(){ kind('one'|'two'|'extra'), tpl, form, nums[], warm, options[4], answerIdx, answer, mid, step, miss }, tapAnswer(i), autoSolve() }`
- 语音：wor_tut_watch'看！听一听算一算'/wor_tut_turn'你来算一算'/wor_hint'听一听题目再算'/wor_wrong'再想一想，听一听题目'（既有 clip 一字不改）；
  题面拼接=模板段 wor_tpl2_*（38 条=9 模板×3-5 段）+数词 wor_n_1..35（21-35 r13 新增）交替；wor_tpl2_* 全部从 game-data TPL_VOICE 表正则提取合成（零手抄）；
  旧 24 条 wor_tpl_*（一步小数值题面）已退役：manifest 冻结字面量 games=[]（文案/音频一字不改，不再注入页面）

## §3 grid 坐标寻宝（r13 真值现行版：8×8 相对导航多目标依序；指令键款，不灰化）
> **r13 难度改造（2026-09-15，据 difficulty-audit/AUDIT-78.md:67 五项 delta 重做）**：5×5 绝对坐标点选款退役，改为 8×8 相对导航+朝向状态机+多宝箱依序规划款。旧 go/report/walk 三题型与 rowlbl/collbl/tapCell/tapDir 钩子随之废弃。

**玩法**：小兔子带朝向（N/E/S/W，箭头环旋转+前方格虚线预览）站 8×8 起点；pad=前进/左转/右转/拿宝箱（≥96）+退一步（≥64）。指令族封闭：`fwd n(1-3)`/`L`/`R`/`T` 表驱动。四难度章（dch 循环取材，每关 5 题，qi0 恒热身）：
- **dch1 exec1**（执行单步）：qi0 热身 [fwd1,T]；qi1-4=2 移动命令+T，0 墙 1 箱，句 ≤14 字
- **dch2 exec2**（执行短程序）：qi0 热身 exec1 型（1 移动命令）；qi1-4=3 移动命令+T，墙 0-2 离路径，句 ≤20 字
- **dch3 plan**（自由规划）：qi0 热身 exec 型；qi1-4 自由规划依序 2 箱，墙 2-4，段距 ≥2
- **dch4 maze**（迷宫绕行）：qi0 热身=单箱 plan 型；qi1-4 依序 3 箱，墙 6-10，**含死端格（4 邻自由度=1 且距起点 ≥2）+绕行段（分段 BFS 距离>曼哈顿）双结构断言**

- **朝向状态机**：左转 N→W→S→E（TURN_L）；fwd 沿朝向走，出界/撞墙=bump 原地零惩罚不计 miss（§0.7a 物理探索）；L/R 改朝向不动步；T=到访拿宝箱
- **多目标依序（r13 delta③）**：站 next 箱+T=收集（撤销栈清空=检查点）；站未来箱+T='order' 错序 miss+方向级反馈 queue(['gri_i_next',n,'gri_i_box']) 不罚死；非箱格 T='nope' 探索不罚；全序收集完=该题完成。步数表「已走 X 步 · 最短 Y 步」常显（Y=依序分段 BFS 和）；撤销=LIFO 回退原子动作（fwd 回格步数不减/转向反转/exec 同步回卷指令条）
- **miss 源**：exec 指令错配（非当前命令类型）+plan/maze 错序 take；bump/撤销/非箱格 T 不计。星级按真错点：0=3 星/≤2=2 星/否则 1 星；retries 仅统计
- 数值域：8×8 恒定；**格 ≥44px 触控下限双 viewport（r13 delta① 定死）**；相邻题互异（起点+首箱）；生成关 flat≥20 seed=mulberry32(flat*7919+13) 不变，dch=首抽 ri(rnd,1,4)（Python verify 独立复刻对账）；每题依序分段 BFS 全可达（verify 内 JS 独立副本+Python 双重复算，r13 delta④）
- **时长模型（r13 delta⑤，照 crd r12 范式）**：quizDur=CHEST(950)+Σ_actions[max(voiceWin,DECIDE_MS[kind])+ADV(600)]；DECIDE_MS={exec1:7000,exec2:8500,plan:9000,maze:10000}（7-8 岁认知决策推算）；ENTER=400/STAGE=400；LEVEL_MIN_MS=40000——40 关 modeled 实测最低 **126350ms@flat28**；句长 cap 托底 voiceWin≤DECIDE（cap*345+600+ENTER_TAIL≤DECIDE）
- 救援：exec=当前命令键 breathe+重读题面（queue 指令句全 clip）；plan/maze=下一个宝箱格 breathe+play(gri_i_order)；只有合法推进/读题重置救援钟；sayW 不灰化 `=== 2`
- 钩子：`GR = { get currentLevel, get quiz(){ kind('exec1'|'exec2'|'plan'|'maze'), pos{r,c}, heading(N/E/S/W), walls[], chests[], next, seq[{t,n}], seqIdx, fwdLeft, steps, optSteps, collected, step, miss }, tapFwd(), tapTurn('left'|'right'), tapTake(), tapUndo(), autoSolve(), get tutorial, get rescues }`
- 语音（26 gri=旧 17 一字不改+r13 新 9）：gri_tut_watch'看！宝藏在格子里'/gri_tut_turn'你来找一找'/gri_hint'听一听，行和列'（旧 hint 保留兜底）/gri_wrong'再想一想，听一听'；**r13 新**：开场任务 gri_i_hint'听一听，想好再走'→OPEN_RELAY 3000ms 接力题面；指令句全 clip 拼接=gri_i_fwd'向前'+gri_n_N+gri_i_ge'格'+gri_i_left'向左转'+gri_i_right'向右转'+gri_i_take'拿到宝箱'（§0.23 禁 key:null）；plan 题面=gri_i_order'按顺序拿到宝箱'；错序三段=gri_i_next'先拿'+gri_n+gri_i_box'号宝箱'；方向词 gri_d_*（fwd 后播绝对方向词——相对→绝对桥接）
- 兜底模板（静态板面+动态参考解，BFS 预验算）：exec1=(1,1)N [R,fwd2,T]；exec2=(3,3)S [fwd3,fwd2,T] 墙(6,2)；plan=(8,6)S 箱[(5,1),(2,4)] 墙[(5,6),(8,2)]；maze=(3,6)S 箱[(8,1),(1,1),(2,5)] 墙 8 块
- 生成关章序（家族 F）：预告=GEN_HINTS[genLevel(f+1).dch-1]（实算下一关难度章），禁 CHAPTERS[(ci+1)%4] 取模推进形态

## 语音与验收

- gen_clips.py：ALL 数组加 'money','wordprob','grid'；三款 tut/hint/wrong 9 条+**拼接单元**（men 数词 1-20 共 20+men_q 5 段/wor 数词 20+模板段从 game-data 模板表正则提取/gri 数词 5+短语 3+方向 4）≈ 85 条；manifest 预计 549→635±10；全部从 game-data 表正则提取或本 SPEC 定稿文案
  - **r13 增量（2026-09-15，wordprob 难度改造）**：wor_tpl2_ 38 条（两步题库，game-data TPL_VOICE 正则提取）+wor_n_21..35（15 条）共 53 新键；旧 wor_tpl_ 24 条退役=manifest 冻结字面量 games=[]（文案/音频一字不改不注入）；wordprob 页内注入=3 core+4 通用+35 数词+38 模板段=80 条
  - **r13 增量（2026-09-15，grid 难度改造）**：gri_i_* 9 条新键（fwd/ge/left/right/take/order/next/box/hint 指令句全 clip 化，§0.23）；旧 17 条 gri_* 一字不改；grid 页内注入=3 core+17 旧+9 新=**29 条**
  - **r15 增量（2026-09-16，money 难度改造）**：men_q_buy_j/men_q_and/men_q_and_j 3 条新键（ch1 角价尾句整条+ch2 买两件接续段两态，照 men_q_jiao 病句教训尾句整条化）；旧 30 条 men_* 一字不改；money 页内注入=3 core+30 旧+3 新=**36 条**
- 三款 verify 必含：40 关全量审计（数值域/干扰约束/热身/互异禁 0 负/凑钱可凑性/应用题运算正确性/寻宝可达性与最短路）+确定性+引擎直驱+教学链+sayW 三态+clipOk+开场链+双 viewport+冒烟
- 首单元门禁（batch-verify）：首款全指标过闸才放其余复验：verify 全 PASS+无头真实点击通关+双 viewport+离线+截图像素非空白+钩子齐
- 试玩人设：7 岁半（二年级向，识字但核心指令不依赖阅读）
