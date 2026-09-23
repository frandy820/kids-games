# SPEC-R37-CALENDAR · 日历小星难度加深改造（r37，2026-09-21）

依据：AUDIT-67 段序 21（黄款清单段序 11）🟡 判定「会话 959s：**星期+1 接龙秒答，
反向与跨年界是仅存内容**」；建议三维度（多步跳(后天/上上周) / 日期+星期复合 /
跨月界题）。校准：b26 段标称 6-7 岁幼小衔接，宁难勿易——r15-r36 同口径。
本文件为 calendar 的 r37 难度谱定稿；与 SPEC-BATCH26 §0.63/§3 旧文冲突处以
本文件为准（r28-r34 同款声明）。**flat 区间以款内 CH_LEN=5 真值为准**（r33 教训）：
静态 20 关=flat 0-19（ch=flat/5+1），生成关 flat≥20。

## §R0 目标与验收铁律

保留玩法框架（4 卡点选单步判定 engTapOpt / 序列条可视化 / 星级 / 救援双锚 /
教学 看→帮→独 / 确定性 seeded），消除「+1 接龙秒答」——改造后须达到 6-7 岁
时间序列多步推理+跨域映射+历法边界负荷。验收铁律：agent 不自验（主线独立
复验为准）；**新语音键禁自注册**（§R6 TODO 清单+文案，gen_clips 主线统一；
当前新题型语音走 `voice.say` 文本轨——core Task#46 阶段3 删 speechSynthesis
后=静默+console.warn（§R4 勘正），键注册为上线必做）；
**禁动 voice/gen_clips.py**（并发轮主线独占）。计数断言改动前已 grep 全款
`== N` 四层清点（§R7 表）。

## §R1 设计总纲（审计三建议承接方式+逐条论证）

**维度一·多步跳（day_2 后天 / day_m2 前天 / month_2 下下个月 / month_m2 上上
个月）——全承接**。新 4 kind，环步进 ±2。题面句「今天是星期三，后天是星期
几？」。难点=跨环界两跳（星期六的后天=星期一，绕环）与**中转词近对**：±2 题
的强近对=±1 中转词（星期三的后天=星期五，孩子最易点「星期四」=明天）——
教育性近对（两跳路径的中转点），干扰构造见 §R3。原 ±1 题型全保留（ch1 起
步坡+教学锚不动）。

**维度二·日期+星期复合（dateq）——降维承接为「日期锚+星期步进」**。形态：
「X号是星期A，X+2号是星期几？」（日期差恒 +2，锚日期 1-8 号，目标 3-10 号）。
降维论证：完整复合（任意日期差+大日期基数+反向差）对 6-7 岁过载；最小可行
复合=差恒 2+数字域 1-10（儿童熟悉）+方向恒正。教育本质=「日期走 2 天=星期
走 2 天」跨域映射不变量+跨周界（X号=星期六 → X+2号=星期一）。答案仍为
DAY 族词（序列条/近对律与既有框架同构），日期词只进题面/确认句（TTS），
不新增答案词形。

**维度三·跨月界（cbound）——承接为「月末边界」专项**。形态：「十月三十一号，
明天是几月几号？」→ 答案卡「十一月一号」。封闭表 11 源月（**二月不做源月**
——28/29 闰年歧义，6-7 岁不需要；二月可做目标月）。大月（31 天：1,3,5,7,8,
10,12）与小月（30 天：4,6,9,11）差异正是教育点。干扰三连：d1=**不存在日期**
（「十月三十二号」/小月「四月三十一号」——最强教育近对，错点专属反馈
「十月没有三十二号哦」=大月小月教学闭环）；d2=下月二号（答案后 1 格）；
d3=下下月一号（答案后 2 格）——d2/d3 相对答案均在未来侧，**沿用 fwd.after
在册模板 cal_fb_fwd_a**（「它排在后面哦，往前找找」全句面字面真），仅 d1 走
TTS 专属句。超段辩护：大月小月是一年级下内容，作为 ch4 压轴+TTS 反馈即教学
+选项封闭 11 行+干扰含强提示性的不存在日期（错点即学到「十月只有 31 天」）。

**方向反馈三路分区（v1 ±1 逐行不动+新题型专属通道；设计定稿更正：弃「答案
中心化重构」）**：v1 dirText 按 base 环序分区（fwdD=wi-bi），±1 题 15 例硬编
码表（verify ⑮）逐行保持。**±2 题复用 v1 模板经推演存在字面假**（点中转词
星期四：任何「已经过啦/排在后面」表述对「明天」未过去却排在答案前的双重参
照均不能同时为真），故 jump/dateq 走**数数教育三路**（s=沿数数方向步数）：
s=0→自指句（在册 cal_self_*）；s=1→「再多数/少数一天（个月）哦」（直接教
步数——比方位模板教育价值更强）；s≥2→「数过头啦，往回数一数」。cbound：
d1 不存在日期→「{src}没有{N+1}号哦」大月小月教学句；d2/d3 相对答案（下月
一号）恒未来侧→fwd.after 在册模板（字面真：二号排在一号后面）。全部新句
≤9 字 est≤3705（**勘正：cbound d1 反馈句实为 10 字 est=4050（十一/十二月行「十一月没有三十一号」），build 按 10 字断言 4350+300≤4600 罩得住——r37 审查 minor1**），wrongChainUntil=4600 窗不动。

**宁难勿易裁量边界（三不做）**：①不做任意日期差/反向差复合（dateq 差恒+2）；
②不做二月源月与闰年；③不做「日期+星期双答」（4 卡点选框架容纳单答案词）。

## §R2 难度谱定稿（章弧重排；CH_LEN=5 / STATIC_LEVELS=20 / 星级口径不动）

KINDS 10 型（前 4=旧型不动）：`day, month, day_rev, month_rev, day_2, day_m2,
month_2, month_m2, dateq, cbound`。族归属：day*+dateq→DAYS（dateq 答案=星期
词）；month*+cbound→MONTHS（cbound 序列条=月份条；opts 词形=组合日期词，
独立封闭表）。步进 d：day_2/month_2=+2，day_m2/month_m2=-2，dateq=+2，
其余=±1。

| 章 dch | 章名（不变） | 每关 5 题谱（槽位洗牌） | 相对 v1 |
| --- | --- | --- | --- |
| 1 flat0-4 | 星期排排队 | day×5（**逐行不动**——教学锚 flat0 题0 恒 day/星期三→星期四；五关并集全 7 天） | 无变化 |
| 2 flat5-9 | 月份排排队 | month×3（famPool 轮转窗 (lv*3+i)%12，五关并集保全 12 月）+ monthJump×1（±2 常规，base=月池洗牌）+ monthJumpCross×1（跨年多步：+2 base=十二月→二月 或 -2 base=一月→十一月，seeded 二选一） | +多步跳+跨年两跳 |
| 3 flat10-14 | 倒着想 | day_rev×1 + month_rev×1 + day_m2c×1（前天跨界：base∈{星期一,星期二}seeded）+ month_m2c×1（上上个月跨界：base∈{一月,二月}seeded）+ 接龙跨界×1（CROSS_TAIL day/month seeded，v1 难点保留） | 反向族升多步+跨界密度 1→3/关 |
| 4 flat15-19 | 大挑战 | anyOld×1（旧四型 seeded）+ anyJump×1（跳四型 seeded）+ dateq×1 + cbound×1 + anyAll×1（旧四+跳四 seeded——**dateq/cbound 只由固定槽出，恒各恰 1**，谱断言稳定） | +复合+跨月界恒各 1 |
| 生成 flat≥20 | —— | dch=ri(1,4) 随机章型（不变），dch4 含 dateq/cbound | 谱同上 |

- 章名/章末预告 hint/GEN_HINTS **零改动**（C7 断言面不动；ch2 hint「倒着想一
  想，昨天是哪一个」预告 ch3、ch3 hint「接龙和倒着想混在一起」预告 ch4 混合
  ——新多步跳是既有「接龙/倒着想」的自然加深，非新规则，不加预告）。
- 锚面（结构性，机检）：flat0 题0 恒 day/星期三→星期四；CH_LEN=5；
  STATIC_LEVELS=20；种子 mulberry32(flat×7919+**401**)；星级 0/1-2/≥3 错→
  3/2/1★（永不 0 星）全不动。
- 存档键 kidsgame_calendar v1.0 / levels/stars / calendar.tutSeen 结构不动
  （家族 C，无迁移）。

## §R3 生成律（确定性通道；verify/_selftest/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+401)；**flat0-4 谱逐行不动（rnd 消耗
  序不变——dch1 生成路径零改动）**；flat≥5 specSeqOf/buildQuiz 消耗序变=
  **谱全刷新**（r28/r32/r34 声明；baseline 对照见 §R8）。
- **specSeqOf 新谱（rnd 消耗序固定，逐章）**：
  - dch1：原样（famPool 轮转窗）。
  - dch2：单步 3 槽 base=pool[(lv*3+i)%12]（i=0..2）；monthJump 1 槽 base=
    shuffled(MONTHS) 逐关取；monthJumpCross 1 槽：rnd()<0.5 ? {month_2,十二月}
    : {month_m2,一月}；5 槽 shuffled。
  - dch3：day_rev base=shuffled(DAYS 排星期一) 取、month_rev base=shuffled
    (MONTHS 排一月) 取、day_m2c base=rnd()<0.5?星期一:星期二、month_m2c base=
    rnd()<0.5?一月:二月、跨界=CROSS_TAIL[rnd()<0.5?'day':'month']；shuffled。
    **勘正（r37 审查 minor2①）：实际消耗序跨界 rnd 最先（game-core L70），本行
    文字顺序仅列构成非消耗序——按本行字面序重写会得不同谱。**
  - dch4：anyOld=KINDS[ri(0,3)]、anyJump=KINDS[4+ri(0,3)]、anyAll=KINDS[ri(0,7)]
    （**勘正：原写 ri(0,9) 笔误——anyAll 只取旧四+跳八共 8 型（game-core L81）；
    按 ri(0,9) 实现 dch4 计数断言必红——r37 审查 minor2②**），
    dateq/cbound 固定槽；各族 base 池独立 shuffled 逐取（dateq 消耗 DAYS 池
    +DNUMS 池；cbound 消耗 CB_ROWS 池）。
- **buildQuiz 新构型**：
  - ±1 旧型：干扰=base+答案另侧邻+1 随机（v1 原样）。
  - jump 四型：answer=stepOf(fam,bi,±2)；干扰=**中转词** stepOf(fam,ai,∓1)…
    即 near1=stepOf(fam, ai, -d)（答案往 base 方向 1 格=路径中转）、near2=
    stepOf(fam, ai, +d)（答案外侧邻）、wild=池随机（排除前三，池含 base）。
    近对在场律（答案环距 1 ≥1 在干扰）由 near1+near2 自动满足。
  - dateq：spec={kind:'dateq', base:星期锚, dn:0-7}（DNUMS 下标）；answer=
    stepOf(DAYS,bi,+2)；干扰构型同 day_2（中转=锚+1 星期、外侧=答案+1、随机）。
    题面句「{DNUMS[dn]}是{base}，{TNUMS[dn]}是星期几？」。
  - cbound：spec={kind:'cbound', row:0-10}（CB_ROWS 下标）；answer=行内
    下月一号；opts=[answer, d1 不存在日期, d2 下月二号, d3 下下月一号]
    shuffled。**无 base 干扰槽**（题面词形=「十月三十一号」不进卡）。
- **CB_ROWS 封闭表（11 行，JS/Python/verify 三方独立重列；二月不做源月）**：
  `一月31→二月一号 | 三月31→四月一号 | 四月30→五月一号 | 五月31→六月一号 |
  六月30→七月一号 | 七月31→八月一号 | 八月31→九月一号 | 九月30→十月一号 |
  十月31→十一月一号 | 十一月30→十二月一号 | 十二月31→一月一号`。
  每行词形：题面=「{src}月{月末}号」（如十月三十一号）；d1=「{src}月
  {月末+1}号」（十月三十二号/四月三十一号）；d2=「{next}月二号」；
  d3=「{next next}月一号」（十二月行 d3=二月一号）。
- DNUMS=['一号'..'八号']（锚），TNUMS=['三号'..'十号']（目标=锚+2）；
  verify 侧独立重列一号~十号全表。
- **structWhy 扩**：kind∈KINDS(10)；answer=stepOf(±1/±2)（dateq=+2）/
  cbound=行表对账；opts 互异+恰 1 right+词∈对应封闭集（环族=fam / cbound=
  该行 4 词形集合）；近对在场（环族=答案环距 1 ≥1；cbound=**d1 不存在日期
  在场**断言）；dch1 全 day / dch2 全 month 族（month/month_2/month_m2）/
  dch3 谱规则（非跨界题必须 rev 族——含反向多步）/ dch4 dateq+cbound 各恰 1；
  anchor flat0q0；相邻题 kind+base（+dn/cbrow）签名互异；初始态干净。
- **engTapOpt/engStars/engWon 零改动**（判定层单步不变）；correctIdx 不变。

## §R4 UI/语音/时序面（r31/r34 时序表=新增时序面清单：本轮零新增 timer）
- **判对窗沿 T46 动态先例（禁回退固定窗）**：uiTapOpt 收尾窗=
  `chainQ(q) ? Math.max(estMs(confirmText(q)), chainMs(confirmKeys(q)))
  : estMs(confirmText(q))` + CONFIRM_PAD——段链题型（±1 旧四型）clip 链实长
  罩 TTS 估算（T46 实测 clip 慢于 SAPI），新题型（jump/dateq/cbound）无段链
键走 estMs 动态窗。主窗 800 不变。
  **勘正（r37-bis 审查 M2，2026-09-21）：r37-bis 后 chainQ/OLD_KINDS 已删——
  全十型恒 playChain、判对窗恒 max(estMs, chainMs)+PAD（37 键注册后 chainMs
  按 CAL_CLIP_MS 75 行实长自动罩窗）；本段 chainQ 分路口径为 r37 一轮历史，
  现状以 §R6-bis 为准。**
- **题面/确认句播放分路**：`chainQ(q)`（=旧四型）走 playChain 段链（quizKeys/
  confirmKeys T46 在册键）；新题型走 `KIDS.voice.say(quizText/confirmText)`
  文本轨。**勘正（2026-09-21 摸底复核）：core（design/core.js）Task#46 阶段3
  已删除 speechSynthesis——speak=console.warn 静默丢弃，故键注册前新题型
  题面/确认/方向/hint 语音=静默**（非 TTS 兜底；verify 页 stub 在 KIDS 层拦截，
  断言面不受影响——测的是调用轨非可听性）。**不伪造缺失键**——显式分支，
  playChain fallback 通道保留为段链题型的防御；§R6 TODO 键注册为上线必做项。
- **方向反馈（sayWrong→dirText/dirKey）**：三路分区（§R1 定稿）——±1 旧型
  base 中心逐行不动（在册键 cal_fb_*/cal_self_*）；jump/dateq=数数教育三路
  （s=0 自指句在册键 / s=1 差一步 / s≥2 数过头——后两者 dirKey=null 走
  `play(null,text)` 文本轨，键注册前静默）；cbound d1=文本轨专属句（≤9 字，
  键注册前静默）/d2,d3=cal_fb_fwd_a
  在册键。**sayWrong 键轨断言面**（verify ④b）泛化为双通道：cal_fb_/cal_self_
  前缀键 或 null+文本 ≥4 字（静默=FAIL；flat5 无 cbound，jump 数数句走
  null 通道——v1 断言对新题型会假红，已适配）。
- **救援两级**：14s 方向级 rescueDirVoice——段链题型（含 ±1）原样（接龙=
  [cal_q]+题面段链接力 / 反向=题面段链重读）；新题型（jump/dateq/cbound）=
  纯题面 TTS 重读（playChain 缺键 fallback 或显式 say 分支）；lastDir 独立锚
  不动。30s 答案级=正确卡 breathe+题面重读（分路同上）；lastAct 锚语义不动
  （主动读题重置/救援不重置——r24 M1 声明沿用）。教学「帮」5s 重演示不动。
- **兔兔 hint 分向**：±1 接龙=cal_hint / 反向=cal_prev（在册，原样）；+2 族=
  「数一数，往后数两天/两个月」；-2 族=「数一数，往前数两天/两个月」；dateq=
  「日子过两天，星期也走两天」；cbound=「想一想，这个月过完是哪个月」
  （全部 play(null,text) 文本轨，键注册前静默，§R6 TODO 键清单）。空白 10s
  轻提示同分向。
- **门族一致性（r34 F1 清点对齐）**：四 listener 门= rabbit(locked/demo/won) /
  replay(locked/demo/won) / hear(locked→**补 state.demo**——v1 漏，教学 watch
  期点喇叭播题面与 watch clip 叠播，F1 同型) / scene(locked/demo→**补
  state.won** 纵深对齐，行为无变化：won 期 quiz=null 已防)。board 卡点选走
  uiTapOpt 门（locked/demo/won 三门原样）。stage 空白（locked/won/demo 轻叮）
  原样。
- **重入矩阵（r30）**：locked 门+cur!==run 身份守卫+锚写入 await 前同步——
  判定层零改动，uiTapOpt 结构不动；教学演示 demo 通道豁免原样。
- **文案卫生（r34 M1）——新模板拼接句逐条朗读检查表**（全句面字面真）：
  「今天是星期三，后天是星期几？」/「这个月是三月，下上个月…」（禁——
  固定「下下个月」全词）/「一号是星期六，三号是星期几？」/「十月三十一号，
  明天是几月几号？」/确认句「星期三的后天是星期五」「三号是星期一」「明天
  是十一月一号」/反馈「十月没有三十二号哦」——逐条无叠字、无语义矛盾
  （build.py 加「下上」「月月」禁串断言防拼接事故）。
- **布局**：cbound 卡词 5-7 字（「十一月三十一号」7 字）——.card 按词长加
  wide5(22px)/wide7(18px) 字号类（卡 ≥96×96 断言不变，word 不溢出卡宽）；
  dateq 题面句 12-13 码点 nowrap 23px≈300px<600px 场景宽不溢出；序列条
  dateq=7 格/cbound=12 格（famOf 扩展自动）；双 viewport 断言面不变。

## §R5 verify/_selftest/verify_one 三方适配（断言从 SPEC 推导，r31 判别力）

- **game-verify.js**（16 单元框架内适配+新增 ⑰，total 56→57）：
  ① 40 关全量：structWhy 新规则+dch4 谱断言（dateq/cbound 各恰 1+kinds 唯一
  数 ≥4）；② 封闭集对账：SPEC_KINDS 10 独立重列+CB_ROWS 11 行+DNUMS 独立
  重列+answer 独立算（succ/pred/succ2/pred2/cbound 查行）；③ ch3 跨界专项：
  接龙跨界 ≥1（保）+新增反向跨界多步恰 2（day_m2c/month_m2c）；④ flat0
  点卡单元不动（day/星期三 锚）；④b flat5 错反馈前缀断言保持（ch2 无
  cbound）；⑤ 教学链不动（flat0）；⑥⑦⑧ 冒烟不动（taps=5/星级口径）；
  ⑨ 分布：d1n=7 保/d2n=12 改**全题 base 并集**（多步 base 计入）/dch3 谱
  /dch4 谱/生成关四型全现+生成 dch4 含新题型；⑩ 布局：cells=fam 扩展+
  cbound 卡 ≥96（wide 类）；⑪ clips 47 断言**不动**（零新键）；⑫ 星级
  不动；⑬ hint C7 不动；⑭ SPEED 不动；⑮ 分向专项：15 例旧表逐例保持
  （答案中心化等价对拍）+新增 jump/dateq/cbound 例（day_2 点中转词→
  fwd.before 字面真等）+UI 腿 prescan ch3 首题 rev 族（day_rev/month_rev/
  day_m2c/month_m2c 皆可）；⑯ estMs 枚举扩全 kind 确认句（max=11 字 4395）+题面句新 max 记录；**⑰ 新题型专项（新）**：jump 环步 ±2 独立复算
  ×40 关/dateq 日期-星期双表对账（dn→dn+2 词形+answer=succ2）/cbound 11
  行四词形全对账+d1 反馈句字面断言（「没有」+月末+1）/答案中心化 15 例
  旧表复跑。
- **_selftest.py**（28 腿→适配）：Python 独立封闭表扩 KINDS 10+CB_ROWS+
  DNUMS/dch2 月族断言（前缀 month）/dch3/dch4 新谱/近对+cbound d1 断言；
  **4 腿存量过时断言（T46 段链化后未适配，基线 24/28 实证）逐腿适配**：
  tap 语义腿期望改 cal_self_d_f 句「就是今天哦，找它后面的」/救援接龙腿
  期望段链 ['cal_q','cal_d_2','cal_q_day']（全在册纯 clip 链）/救援反向腿
  改段链 ['cal_q_dr1',…] 对账/normal 错选腿期望 'cal_self_d_f' 键；段 5
  正常模式错选断言同步（点 base→cal_self_d_f）。
- **verify_one_calendar.py 适配版归档 _src/**（URL 改 ../index.html 相对，
  主线版不动待主线收编——r34 先例）：T3 章型腿 5-10 月族前缀/ch3 新谱/
  audit_quiz 扩 10 kind+cbound 行表+T4 生成关 dch4 含新题型。

## §R6 新语音键 TODO 清单（主线统一注册；~~上线必做~~→**已完成（r37-bis 段二，
2026-09-21）：37 键注册 manifest 5243+全链可听**——core Task#46 阶段3
删 speechSynthesis 后键注册前新题型语音曾=静默：ch2 多步跳 2/5 题、ch3 反向
多步 2/5 题、ch4 新题型+anyJump 3-5/5 题无声。下文为 r37 一轮历史口径，实施
定稿见 §R6-bis）**

注册后口径：quizKeys/confirmKeys/救援/兔兔 hint 切段链（playChain 自动：
键在册即走链）+CAL_CLIP_MS 增行+chainMs 罩窗自动生效+build n_clips 断言
47→47+N 联动+verify ⑪ need 表扩。文案（与游戏内字符串严格一致）：

| 键（建议） | 文案 | 用途 |
| --- | --- | --- |
| cal_q_d2 | ，后天是星期几？ | day_2 题面骨架 |
| cal_q_dm2 | ，前天是星期几？ | day_m2 题面骨架 |
| cal_q_m2 | ，下下个月是几月？ | month_2 题面骨架 |
| cal_q_mm2 | ，上上个月是几月？ | month_m2 题面骨架 |
| cal_q_dq2 | 号是星期几？ | dateq 题面后段（前段=日期词） |
| cal_q_cb | 的明天，是几月几号？ | cbound 题面后段 |
| cal_cf_d2 | 的后天是 | 确认骨架 |
| cal_cf_dm2 | 的前天是 | 确认骨架 |
| cal_cf_m2 | 的下下个月是 | 确认骨架 |
| cal_cf_mm2 | 的上上个月是 | 确认骨架 |
| cal_cf_dq | 号是 | dateq 确认骨架（前接日期词后接星期词） |
| cal_cf_cb | 明天是 | cbound 确认骨架（后接答案词） |
| cal_num_1..10（10 键） | 一号/二号/…/十号 | 日期词族（dateq/cbound 题面+确认） |
| cal_cbound_1..11（11 键） | 十月三十一号，明天是几月几号？…（11 行题面整句） | cbound 题面整句（月词+数字组合不拆则整句） |
| cal_fb_cb | 没有三十二号哦（或按月各异） | d1 反馈（若做按月版需 11 键） |
| cal_hint_p2 | 数一数，往后数两天 | +2 族兔兔 hint |
| cal_hint_m2 | 数一数，往前数两天 | -2 族兔兔 hint |
| cal_hint_dq | 日子过两天，星期也走两天 | dateq hint |
| cal_hint_cb | 想一想，这个月过完是哪个月 | cbound hint |
| cal_ans_cb_1..11（11 键） | 十一月一号 等 11 答案词 | cbound 答案词（可选） |

最小注册面=14 键（4 题面骨架+5 确认骨架+4 hint+cal_fb_cb）；日期词/整句/
答案词可选（TTS 质量可接受则不注）。**注册前 build/verify 计数断言按现状
47 写死（本轮不动），上表为本 SPEC 声明的注册后联动口径。**

## §R6-bis R37-bis 段链化定稿（2026-09-21 Executor 段一交付；本节为 §R6 的**实施定稿**，
与 §R6 建议表冲突处以本节为准——r37-bis 游戏侧改造已完成，键集 37 键定稿）

### 裁决（与 §R6 建议表的三处差异及理由）

1. **叠字裁决：数字号词含号+骨架不含号**。§R6 原表 cal_num_1..10「一号/…」+
   cal_q_dq2「号是星期几？」拼出「三号号是星期几？」叠字（r34 M1 同族）。定稿：
   cal_num 含号（「一号」…「十号」）+ 骨架 cal_q_dq2=「是星期几？」——拼接
   「三号」+「是星期几？」=「三号是星期几？」字面真；确认句同构（「三号」+「是」+
   「星期一」）。备选「纯数字词+骨架含号」被弃：cbound 确认句「明天是十一月一号」
   需不含「是」的裸号词，两案互斥，含号词族对 dateq/cbound 两处通吃且 cbound 确认
   链免增 11 答案词键。
2. **dateq 题面逗号=段间停顿承载**。「一号是星期六，三号是星期几？」拆 5 段
   [num, dq1「是」, 星期词, num, dq2「是星期几？」]——去标点逐字相等（build.py
   对账口径），句读由 queue 段间 150ms 停顿承载（core voice.queue 设计语义）。
   其余各型键文案自带逗号（与旧型 cal_q_dr2「，昨天是星期几？」同构）含标点全等。
3. **救援非接龙新题型不加 cal_q 引导**。cal_q=「它的后面是哪一个」——对 dateq/
   cbound/jump 反向题型字面假（全句面字面真红线）。rescueDirVoice 定稿：仅
   day/month（±1 接龙）=queue([cal_q]+题面段链)；day_rev/month_rev/jump 四型/
   dateq/cbound=题面段链重读（playChain 缺键兜底文本轨）。
4. **cbound d1 反馈=两段链**（月词+cal_fb_cb_31|32）：sayWrong 支持 dirKey 返回
   数组→queue 两段（「十月」+「没有三十二号哦」=「十月没有三十二号哦」字面全真），
   替代 §R6「按月各异需 11 键」案（11 行只需 2 反馈键+复用在册月词）。

### 键集终表（37 键；注册后 manifest cal_ 44→81，clips 47→84）

| 组 | 键 | 文案 | 用途/拼接示例 |
| --- | --- | --- | --- |
| 题面骨架 7 | cal_q_d2 | ，后天是星期几？ | day_2 尾段：cal_q_dr1+星期词+此键=「今天是星期三，后天是星期几？」（含标点全等） |
| | cal_q_dm2 | ，前天是星期几？ | day_m2 尾段（同构） |
| | cal_q_m2 | ，下下个月是几月？ | month_2 尾段：cal_q_mr1+月词+此键（含标点全等） |
| | cal_q_mm2 | ，上上个月是几月？ | month_m2 尾段（同构） |
| | cal_q_dq1 | 是 | dateq 前段连词+确认句连词共用：「一号」+「是」+「星期六」=「一号是星期六」 |
| | cal_q_dq2 | 是星期几？ | dateq 尾段：「三号」+「是星期几？」=「三号是星期几？」 |
| | cal_q_cb | ，明天是几月几号？ | cbound 尾段：月词+月末号词+此键（含标点全等） |
| 确认骨架 5 | cal_cf_d2 | 的后天是 | day_2：星期词+此键+星期词=「星期三的后天是星期五」（全等） |
| | cal_cf_dm2 | 的前天是 | day_m2（同构） |
| | cal_cf_m2 | 的下下个月是 | month_2（同构，最长句「十一月的下下个月是一月」） |
| | cal_cf_mm2 | 的上上个月是 | month_m2（同构） |
| | cal_cf_cb | 明天是 | cbound 确认首段：「明天是」+「十一月」+「一号」=「明天是十一月一号」 |
| 数字号词 12 | cal_num_1..10 | 一号/二号/…/十号 | dateq 锚 1-8 号∪目标 3-10 号=1-10；cbound 确认尾恒「一号」=cal_num_1 |
| | cal_num_30 / cal_num_31 | 三十号 / 三十一号 | cbound 题面月末：「十月」+「三十一号」=「十月三十一号」 |
| cbound 反馈 2 | cal_fb_cb_31 | 没有三十一号哦 | 小月 d1：月词+此键=「四月没有三十一号哦」（两段链） |
| | cal_fb_cb_32 | 没有三十二号哦 | 大月 d1：「十月没有三十二号哦」（dirText 全等） |
| 数数反馈 5 | cal_fb_j_p1d | 再多数一天哦 | jump/dateq s=1（差一步）：day_2 点中转词、dateq 点锚+1 星期 |
| | cal_fb_j_m1d | 再少数一天哦 | day_m2 s=1 |
| | cal_fb_j_p1m | 再多数一个月哦 | month_2 s=1 |
| | cal_fb_j_m1m | 再少数一个月哦 | month_m2 s=1 |
| | cal_fb_j_over | 数过头啦，往回数一数 | s≥2（含 dateq）；s=0=在册 cal_self_*（不动） |
| hint 6 | cal_hint_p2 | 数一数，往后数两天 | day_2 兔兔/空白轻提示 |
| | cal_hint_m2 | 数一数，往前数两天 | day_m2 |
| | cal_hint_p2m | 数一数，往后数两个月 | month_2 |
| | cal_hint_m2m | 数一数，往前数两个月 | month_m2 |
| | cal_hint_dq | 日子过两天，星期也走两天 | dateq |
| | cal_hint_cb | 想一想，这个月过完是哪个月 | cbound |

### 四路键构造定稿（quizKeys/confirmKeys/dirKey/playHint/rescueDirVoice 实现口径）

- 题面：day_2/day_m2=[cal_q_dr1, 词, cal_q_d2/dm2]；month_2/m2=[cal_q_mr1, 词, cal_q_m2/mm2]；
  dateq=[cal_num_(dn+1), cal_q_dq1, cal_d_(base), cal_num_(dn+3), cal_q_dq2]；
  cbound=[cal_m_(src), cal_num_31|30, cal_q_cb]。
- 确认：jump 四型=[base 词, cal_cf_*, answer 词]；dateq=[cal_num_(dn+3), cal_q_dq1, cal_d_(answer)]；
  cbound=[cal_cf_cb, cal_m_(next), cal_num_1]。
- 方向：jump/dateq s 三路（0=cal_self 在册/1=cal_fb_j_*/≥2=cal_fb_j_over）；cbound
  d1=[cal_m_(src), cal_fb_cb_31|32]（数组链）/d2,d3=cal_fb_fwd_a 在册。
- hint/空白轻提示：六新 kind 各一键（§R6-bis 表）；±1 旧型 cal_hint/cal_prev 不动。
- 救援：day/month=[cal_q]+题面段链；其余=playChain(题面段链)（缺键=文本轨）。
- **注册前行为不变式**（build+JS 穷举双证）：37 新键缺期 playChain/play 缺键兜底=
  整句文本轨（静默告警）——与改造前 say 分支调用轨一致；六新 kind chainMs
  （旧词键在册+新键 0）< estMs 恒成立 → 判对窗恒取 estMs（最紧 month jump 确认
  3420<4050）→ 注册后 CAL_CLIP_MS 增行自动切链实长罩窗（T46 动态式，禁回退固定窗）。

### 全句面朗读检查表（build.py 穷举 221 链+JS 实现层 286 链/dirKey 865 例，双绿）

| 型 | 穷举量 | 代表句（拼接结果） | 检查 |
| --- | --- | --- | --- |
| day_2/day_m2 题+确 | 7×4 | 「今天是星期三，后天是星期几？」「星期三的后天是星期五」「今天是星期一，前天是星期几？」「星期一的前天是星期六」 | 含标点全等；无叠字 |
| month_2/month_m2 题+确 | 12×4 | 「这个月是三月，下下个月是几月？」「三月的下下个月是五月」「这个月是一月，上上个月是几月？」「一月的上上个月是十一月」（跨年） | 同上；「下上」「月月」禁串机检 |
| dateq 题+确 | 8×7×2 | 「一号是星期六三号是星期几？」（去标点=「一号是星期六，三号是星期几？」；逗号=段间停顿）；「三号是星期一」 | 去标点全等；「号号」「是是」禁串 |
| cbound 题+确 | 11×2 | 「十月三十一号，明天是几月几号？」「明天是十一月一号」「四月三十号，明天是几月几号？」（小月） | 题面含标点全等；确认去标点全等 |
| cbound d1 反馈 | 11 | 「十月没有三十二号哦」「四月没有三十一号哦」「十二月没有三十二号哦」 | 与 dirText 全等（两段链） |
| jump/dateq 方向 | 全位次 | s=1「再多数一天哦」/s≥2「数过头啦，往回数一数」/s=0 在册 self 句 | 键文案==dirText 逐位对齐 |
| hint | 6 | 「数一数，往后数两天」等 6 句 | ==playHint 分支字符串（build in 断言） |

### 联动数字（r18/r34 计数四层；段一已改——**键未注册前 build 红=预期**，主线注册 37 键后必绿）

| 层 | 断言 | 段一状态 |
| --- | --- | --- |
| build.py | n_clips 47→**84**（cal 44+37+core 3）+37 新键逐键 in clips+§R6-bis 静态对账段（先于注入，注册前可独立跑绿：221 链+manifest 在册 8 键文案对账+新键「在册即一致」条件对账） | 已改；跑=静态段绿+clips 断言红（预期） |
| game-verify.js ⑪ | keys.length 47→**84**+need 表+37 新键 | 已改；段二重建后绿 |
| game-verify.js ⑮ | keyCases：jump 中转 null→cal_fb_j_*（4 例）+数过头 cal_fb_j_over+dateq 中转例；cbound d1 null→['cal_m_9','cal_fb_cb_32']/小月 ['cal_m_3','cal_fb_cb_31'] 两例 | 已改（SPEC 硬编码从本节键表推导） |
| CAL_CLIP_MS | 38 行不动（37 新键行=**段二注册后按 mp3 实测增补**→75 行；verify ⑪ 两处 38→75 联动） | 段一不增行（不伪造时长占位） |

### 段二清单（主线注册 37 键后，Executor 另行执行）——**2026-09-21 段二完成（全项 ✅）**

1. ✅ manifest+mp3 注册（主线 gen_clips §R6-bis 表硬编码+_RB37==25 断言：manifest
   5206→5243，ok=37 skip=5206 fail=0）→ build 双跑幂等
   md5=**4845e5145e019995dbf0692663735688**（n_clips 84 绿）。
2. ✅ CAL_CLIP_MS 增 37 行（浏览器 Audio 实测：cal_q_dq1=1224…cal_hint_cb=3480）+
   verify ⑪ 38→75 两处联动；⑪ durSpec 81 键 ±60ms 运行时对账绿。
3. ✅ _selftest 救援腿 flat10 jump 分支适配（say→queue 段链断言）。flat10 首题
   seeded=day_rev 走 if 分支，else（jump）断言另经引擎推进实测 MATCH：day_m2 救援=
   queue(['cal_q_dr1','cal_d_0','cal_q_dm2'])。
4. ✅ verify ⑰ cbUi d1 断言适配：queue 链 ['cal_m_x','cal_fb_cb_'+(大月 32|小月 31)]。
5. ✅ wrongChainUntil 4600 复核：cbound d1 链实长=1560+2040+150=**3750** ≤ 4600-300，
   窗不动（余量 850；est 高估的风险未兑现）。
6. ✅ cal_q_dq1 单字「是」=1224ms，与在册词键（cal_m_0 一月 1344ms）同量级——
   非静音哑片、时长正常；韵律属人耳项，主线可抽听（键文案不变）。
7. ✅ 全门禁（agent 自测记录，主线独立复验为准）：build 双跑幂等 4845e514…+
   **verify 57/57**（0 pageerror；经 _selftest 段1+verify_one T1 双入口复跑）+
   **_selftest 28/28**+**verify_one 11/11**。

## §R7 计数断言四层联动面（grep 全款 `== N` 清点，r18/r34 存量假挂坑）

| 层 | 现状断言 | 本轮处置 |
| --- | --- | --- |
| build.py | n_clips==47 / han(max_conf)==10 / est==4050 / nextHint 计数 / estMs 系数 | 47 不动（零新键）；max_conf 枚举集扩新 kind 确认句（**值变 11 字/4395ms**——「十一月的上上个月是九月」3 字月词×2+骨架 6 字超旧 10 字上限，实测勘正）；estMs 345/600 不动；新增禁串断言（「下上」「月月」） |
| game-verify.js | keys.length===47 / CAL_CLIP_MS 38 / taps===5 / d1n===7 / d2n===12 / dch4Agg n===4 / miss===N / stars===N | 47/38/5/7 不动；d2n 改全题并集口径；dch4Agg 改 dateq+cbound 各恰 1+kinds≥4；⑰ 新增；miss/stars 不动 |
| game-core.js | structWhy optsLen 4/rightCount 1/optsDup 4/环距 1/anchor/dch1kind/dch2kind | 数值断言不动；kind 集/章型规则/近对（cbound d1 分支）扩 |
| _selftest.py | len(levels)+len(gen)==40 / len(words)!=4 / count!=1 / dis!=3 / cells in(7,12) / taps==5 | 40/4/1/3/5 不动；PY_KINDS 10+表扩；4 腿过时断言适配（§R5） |
| verify_one_calendar.py | range(20)/range(10,15)/range(20,40)/`kind != 'month'` | 区间不动（CH_LEN=5 真值）；kind 表+月族断言适配（适配版归档 _src/） |

**R37-bis 勘正（2026-09-21 段一）**：上表 build.py/verify 行的「47/38 不动」为 r37
正轮口径；§R6-bis 联动数字表（build 84+verify ⑪ 84+⑮ keyCases）为段链化后最新真值，
两表冲突处以 §R6-bis 为准。

## §R8 基线与验收（agent 自测门禁数字，主线独立复验为准）

- **baseline（改造前实测）**：build 双跑幂等 md5=e2c41b53…；?verify=1=
  VERIFY PASS 56/56（0 pageerror）；_selftest=**24/28（4 腿存量过时断言：
  tap 语义/救援接龙链/救援反向链/normal 错选——T46 段链化后未适配，非本轮
  引入）**；verify_one=11/11。
- **post（改造后实测，2026-09-21）**：build 双跑幂等
  md5=**e56188e214fe0177705a9fb125b501cd**（两次一致）；?verify=1=VERIFY PASS **57/57**（0 pageerror；
  经 _selftest 段1+verify_one T1 双入口复跑）；_selftest **28/28**（4 腿适配后+
  MUTE 双保险装毕）；_src/verify_one_calendar.py 适配版 **11/11**（ch3 谱合法集
  漏 month 跨界一例修正后）；MUTE 双保险=每 context MUTE_INIT init script+
  normal 模式种档 sound:false/tts:false/vol:0（教学链仍触发）。
- **post-bis（R37-bis 段链化+37 键注册后实测，2026-09-21，§R6-bis）**：build 双跑幂等
  md5=**4845e5145e019995dbf0692663735688**；verify **57/57**（⑪ 84 键+75 行 durSpec
  ±60ms）；_selftest **28/28**（救援腿 jump 分支段链适配）；verify_one **11/11**；
  风险②（新题型静默）就此收口——四路全段链可听；风险③（clip 时长对账）已执行
  （CAL_CLIP_MS 37 行实测+⑪ 运行时对账绿）。
- **风险与未验证项**：①cbound 大月小月超段风险（一年级下内容）——已按
  ch4 压轴+干扰教学性+d1 专属反馈缓解，真人试玩观察项；②**新题型语音键
  注册前=静默**（core Task#46 阶段3 删 speechSynthesis——非本 SPEC 预期的
  TTS 兜底，§R4 勘正；ch2 jump 2/5 题、ch3 反向多步 2/5 题、ch4 新题型
  3-5/5 题无声，§R6 键注册为上线必做）；③新题型段链键注册后的 clip 音质/
  时长对账（CAL_CLIP_MS 增行+verify ⑪ ±60ms 联动，主线注册时执行）；
  ④±1 旧行为由 verify ⑮ 15 例旧表硬编码对拍背书（机检），无真人听感差异
  预期；⑤agent 不自验——上列数字为实测记录，主线独立复验为准。

## §R9 r23-r34 教训逐项回应

r30 重入矩阵：判定层零改动，门族四 listener 清点对齐（§R4 F1 修复 hearBtn
demo 门+scene won 门）。r31/r34 时序表：零新增 timer/await（判对窗分路复用
既有动态式，§R4）；T46 动态窗先例沿（禁固定窗）。r31 断言判别力：⑰ 新单元
从 SPEC 独立复算，_selftest 4 腿适配从新 SPEC 口径推导非实现归纳。r25 M2
多步中间态：判定仍单步（无多步状态机新面），dateq/cbound 单答案不变。
r24 M1 救援 idle 锚：救援分路但锚语义不动（声明 §R4）。r28/r32/r34 谱刷新：
§R3 声明 flat≥5 全刷+锚面保留清单+baseline/post 对照。r18/r34 计数断言：
§R7 四层表。r34 M1 文案卫生：§R4 朗读检查表+build 禁串断言。r19 测试静音：
_selftest/verify 全程 MUTE 双保险（playwright 静音 init+种档三关闭）。
r33 flat 区间：§R2 以 CH_LEN=5 真值声明静态 20=flat0-19、生成 flat≥20。
