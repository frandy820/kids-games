# SPEC-BATCH40（扩容批 10 · 120 全线收官批）：ins 昆虫还是蜘蛛 / cbx 冷静工具箱 / brk 问题拆解小博士

2026-09-12 定稿。三款=EXPANSION-120-PLAN #170/#131/#124（5-6 K 类常识科学 / 6-7 I 类 SEL 元认知 / 7-8 H 类信息素养语言）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文 + b31-b39 全部沉淀条款，一项不满足=不收）

**承用清单（不再全文重抄，任务书逐条带）**：
- 契约 A-O+I 补（b31 版）+ b33 三硬性（钩子表 step 语义列/生成关 dch 策略显式声明/build core 注入幂等）+ b36 M1（build verify 独立第 4 script 块+verify ⑨ 断言字面逐条与 main 真源核对）+ b37 三教训（首错锁 ≤wrong+150/探针含真实点击/J 写法 `cur.flat<3`）+ b38 六坑（SPEC 题表脚本验算/verify 照实现 id 抄表/blanks 连盖/hint 枚举黑名单/静态关 dch=flat//5+1/锁窗总窗口径）+ **b39 四沉淀**：
  - **N1 题表服务语义定版=章池+关内 rotate**：题表 20 行=4 章池×5 行，每关取章池按 flat 旋转取 5 题——**题(flat,k)=表行[(flat//5)*5+((flat%5)+k)%5]**（thanks/b39 先例已裁决接受，本批 SPEC 直接按此语义写，verify 独立表同口径）
  - **N2 锁窗断言一律总窗口径**：常量×SPEED+尾窗常数全算，禁只断常量/禁基准 +300（三款 build+verify ⑨ 断言对称，b39 M-1 教训）
  - **N3 探针-selftest 分工定版**：探针=钩子枚举定形状；**真实 DOM 点击验证由各款 _src/_selftest.py 承担（pg.click/dispatchEvent 至少一次）——三款必带 _selftest.py**
  - **N4 长跑验证一律重定向文件跑**（后台 tail 附加掩盖退出码）+ R1 首行等子进程完成属正常（capture_output 非流式）
- 家族 J 教学迷你关 flat=-1 每错必播写法 `cur.flat < 3`；契约 K rescueTick 面板守卫；契约 N keyless TTS 段必居链尾；estMs=n×345+600 全字符三款同式；**新批 clip 前缀先查 manifest 占用**（b40 实证：cal_ 被 b26 calendar 占 5 同名键当场改 cbx_——st_ 事故预防第三次命中）

**本批三款生成关策略（§0.3 显式声明）**：三款均 **seeded 随机 dch**（flat≥20：dch_reseed(flat, seed)，seed ins=887/cbx=897/brk=907）——域全档成立型（无域承诺型括注），与 b34-b39 同构；静态关 flat<20 dch=flat//5+1。

**星级**：三款均 miss 计数款（0=3★/1-2=2★/≥3=1★，永不 0 星）；brk order 族 miss=题级跨步续算（b39 crd 先例——一题 5 步内 miss 累计）。

## §1 ins 昆虫还是蜘蛛（5-6 段·常识/科学）

**玩法**：看动物图（手绘 SVG）听题面 → 两选点选。两族：
- **judge 族（ch1-2）**：题面「这是{动物名}呀，它是昆虫还是蜘蛛？」两选=昆虫/蜘蛛；answer 由 LEGS 表唯一推导（6 腿→昆虫/8 腿→蛛形纲答案=蜘蛛）
- **legs 族（ch3-4）**：题面「数一数它的腿，{动物名}有几条腿呀？」两选=6 条/8 条；answer=LEGS[anim]；**腿高亮视觉锚恒在**（候选图上腿逐条可数——触点/高亮设计由 agent 定，禁把答案画在题面）

**封闭集（数学先验，交付前脚本验算）**：
- LEGS 表 8 动物：昆虫 4=ant 蚂蚁/butterfly 蝴蝶/bee 蜜蜂/ladybird 瓢虫（6 腿）；蛛形纲 4=spider 蜘蛛/wolfspider 狼蛛/jumpspider 跳蛛/scorpion 蝎子（8 腿，蛛形纲非昆虫）
- **judge answer 推导律**：LEGS[a]==6→'昆虫'；==8→'蜘蛛'（verify 按 LEGS 表独立复算，禁抄题表 answer 列——推导律即真值）
- 知识正确性红线：蜘蛛/蝎子不是昆虫（蛛形纲）——科普句必须说「它不是昆虫」，禁「另一种昆虫」表述
- 题表 20 题（章池×5 行 rotate）：ch1 judge（昆虫 3+蜘蛛 2）/ch2 judge（蜘蛛 3+昆虫 2）/ch3 legs（昆虫 3+蜘蛛 2）/ch4 legs 3+judge 2 混合复习；**同关 5 题 anim 互异**（8 池取 5 无重复——验算）
- 科普句（答对后/救援方向级）：昆虫=「昆虫有六条腿，头胸腹三部分」；蜘蛛=「蜘蛛有八条腿，它不是昆虫哦」

**降坡三件（5-6 专项）**：①恒两选（ch1-4 全程，无数值多选）②题面句全语音（动物名 clip ins_a_* 8 条+题模板 TTS keyless 尾）③零文字依赖（两选按钮=昆虫实物小图+蜘蛛实物小图图形呈现，非文字）

**防同质化声明（审查项）**：vs babylove 动物宝宝找妈妈=亲子配对→**生物特征辨析科学判断**；vs habitat 环境归属=语义联想→**可数特征锚（数腿）分类**；vs 机器画师=指令执行→**观察-归纳科学启蒙**——三重差异。

**钩子**：`window.INS = { get currentLevel, get quiz{kind('judge'|'legs'), anim, text, picks[](2), answer, step(全关题号), miss, say}, tapPick(i), start(flat), autoSolve() }`（真实页同暴露）；tapPick 枚举 picked/done/wrong/false(豁免窗错点吞)/null(越界/演出锁)；教学末步 'picked'。

**语音（18=专属 15+core 3）**：ins_tut_watch/turn/hint/right/wrong 5 + ins_a_ant/butterfly/bee/ladybird/spider/wolfspider/jumpspider/scorpion 动物名 8 + ins_sci_insect/ins_sci_spider 科普 2。**实长（_clipdur40.json 实测；审查 m-2 勘误：初稿加法笔误+sci 括注标错，正确=1944+150+3744+300 → 6138；sci max=sci_insect 3744 非 sci_spider）**：wrong 1944/right 2664/hint 2304/tut_watch 3072/sci max 3744（sci_insect）/名音 max ~1500；**错链真值下界 6138——实现窗取初稿字面 6638（保守 ≥6138 成立，verify ⑨ 断言用 6138）**（科普句按 anim 类型取 insect/spider）；确认链 right 2664+300=2964（科普句不挂答对链——审查 ins-1 裁决：确认链数值锚单段自洽）。

## §2 cbx 冷静工具箱（6-7 段·社交情感/元认知）

**玩法**：听情境句（keyless TTS）→ 选「冷静工具」。两档：
- **ch1-2 两选**：1 好卡+1 坏卡
- **ch3-4 三选**：1 好卡+1 坏卡+1 中性卡

**封闭集（数学先验）**：
- 情境表 20 题（4 章×5 题章池 rotate）：ch1 生气 5/ch2 难过 5/ch3 害怕 5/ch4 沮丧 5——每题={情绪族, 情境句 8-14 字, 好卡 id, 干扰集}；**同章 5 题情境句互异**
- 策略卡池 11：**好卡 5**=breath 深呼吸/countten 慢慢数到十/hugbunny 抱抱小兔子/sayout 说出来/drinkwater 喝口水；**坏卡 4**=throw 摔玩具/shout 大喊大叫/hit 打人/tear 撕书；**中性 2**=cryonly 一直哭/hide 躲起来不理人
- **好卡唯一解锚**：每题 answer 恰 1 张好卡（题表显式 answer 列——好卡对四情绪均合法不锁情绪映射，但每题定死唯一保 verify 可对账）；干扰=1 坏（ch1-2）或 1 坏+1 中性（ch3-4）；**同题好卡必在候选、坏/中性从池抽不与好卡同 id**
- **SEL 铁律（坏反馈指向行为后果，非否定人格）**：坏卡错点反馈=具体后果句（throw→「玩具摔坏了，你也会更难过」/shout→「大喊大叫，旁边的人也难受」/hit→「打人会让别人疼，还会失去朋友」/tear→「书撕坏了，就没人能看了」）；中性卡反馈=温和引导（cryonly→「哭一会儿可以，一直哭问题还在哦」/hide→「躲起来，大家就帮不到你啦」）；好卡答对=确认句+科普句（breath→「慢慢吸气，再慢慢呼出来」等）
- ch3-4 三选候选互异（好/坏/中性三档各 1）

**降坡/适配**：6-7 岁文字允许但情境句全语音承载（keyless TTS，comfort 先例）；策略卡=图标+短词（3-4 字）图形+文字双通道。

**防同质化声明（审查项）**：vs comfort 安慰选择=向外安慰别人→**向内自我调节策略**；vs etm 表情温度计=识别命名情绪→**选应对动作（策略工具箱）**；vs thanks 感谢的话=社交回应行为→**情绪管理元认知**——三重差异（+工具箱隐喻独有）。

**钩子**：`window.CBX = { get currentLevel, get quiz{emo, scene(keyless), picks[](2|3 卡 id), answer, step, miss, say}, tapPick(i), start(flat), autoSolve() }`；tapPick 枚举 picked/done/wrong/false/null；教学末步 'picked'。

**语音（19=专属 16+core 3）**：cbx_tut_watch/turn/hint/right/wrong 5 + 好卡句 5（cbx_g_breath/countten/hugbunny/sayout/drinkwater）+ 坏卡后果 4（cbx_b_throw/shout/hit/tear）+ 中性 2（cbx_n_cryonly/hide）。**实长（_clipdur40.json 实测；审查 m-3 勘误：初稿「后果句 max 4224（b_hit）」键标错——b_hit=3648、4224=g_breath 好卡句）**：wrong 2160/right 2592/hint 2208/tut_watch 3000/后果句 max 3648（b_hit）/好卡 max 4224（g_breath）；**错链真值下界=2160+150+3648+300=6258——实现窗取初稿字面 6834（保守 ≥6258 成立）**（按所点坏/中性卡取具体句）；确认链=right 2592+150+好卡句+300 动态两段窗（5370-7266 恒≥单段下界 2892——审查 cbx-1 裁决：好卡句承载策略指导=SEL 教学本体，两段并集满足）。

## §3 brk 问题拆解小博士（7-8 段·信息素养/语言）

**玩法**：大目标拆小问题。两族：
- **pick 族（ch1-2）**：给大目标+候选池 5 张（正确子步骤 3+干扰 2）→ 点选 3 张正确的（点对飞入「小问题清单」；点错=miss+方向级反馈；点满 3 对=题完成）
- **order 族（ch3-4）**：给大目标+5 子步骤乱序 → 按正确顺序逐张点选（每点一步重读 quiz——连选驱动，b38 坑③；错点=miss 可重点；5 步点完=题完成）

**封闭集（数学先验，交付前脚本验算）**：
- 目标表 8 目标×5 子步骤=40 卡（**SPEC 定表=真值源，agent 照抄，verify 照抄对账**）：
  - birthday 办一场生日聚会：定个好日子 → 写邀请卡 → 准备蛋糕 → 布置房间 → 请朋友来玩
  - picnic 去公园野餐：看看天气预报 → 准备三明治 → 装好水壶 → 带上野餐垫 → 找个好位置
  - cardmake 给妈妈做贺卡：想对妈妈说的话 → 准备彩纸 → 画上爱心 → 写上祝福 → 送给妈妈
  - planttree 种一棵小树：挑一棵小树苗 → 挖一个小坑 → 把树苗放进去 → 填土浇水 → 插上小名牌
  - bagpack 整理小书包：看清课程表 → 拿出不用的书 → 放好明天的书 → 检查铅笔盒 → 拉好拉链
  - washhand 洗干净小手：卷起袖子 → 冲湿小手 → 抹肥皂搓泡泡 → 冲洗干净 → 用毛巾擦干
  - feedrabbit 喂小兔子吃饭：先洗洗小手 → 拿新鲜的菜叶 → 切成小段 → 放进食盆 → 添一点水
  - bedtime 准备上床睡觉：收拾好玩具 → 刷牙洗脸 → 换上睡衣 → 听一个小故事 → 关灯睡觉
- **子步骤唯一归属**：40 卡两两字面互不重名且每卡恰属 1 目标（SPEC 定表已人工核+_verify_spec40.py 验算）；干扰卡=跨目标借用（∉ 本目标步骤集——verify 验算）
- **排序真值=SPEC 定序表**（上表箭头序）；order answer=定序表
- 题表 20 题（章池×5 rotate）：ch1-2 pick（目标轮换——8 目标取 10 题，每章 5 题目标互异）；ch3-4 order（同轮换）；**同关 5 题目标互异**（8 池取 5——验算）
- pick 族干扰验算：每题池=本目标 5 步取 3 + 他目标 2（同题干扰 2 张互异且 ∉ 本目标）

**降坡/适配**：7-8 岁文字允许（子步骤=4-6 字短句文字+TTS 读卡）；目标名 clip brk_t_* 8 条（题面「帮小兔子拆一拆：办生日聚会」=模板 TTS+目标名 clip 拼接）；干扰反馈方向级=「这张是别的任务用的哦」不点破来源（排除法可玩）。

**防同质化声明（审查项）**：vs sentorder 句子拼拼乐=语言语序→**任务功能分解（信息素养：大问题→可做的小问题）+相关性判断**；vs libr 分类归档=主题分类→**目标-步骤功能性从属+执行序列**；vs habit 好习惯排序=固定六流程模仿→**开放目标域拆解+干扰辨识**——三重差异。

**钩子**：`window.BRK = { get currentLevel, get quiz{kind('pick'|'order'), goal, cards[](候选 5 张 {id,label}), answer, answerList(pick=3 id 集/order=5 步序), picked[](已选), step(全关题号), miss, say}, tapCard(i), start(flat), autoSolve() }`；tapCard 枚举 fill/done/wrong/false/null（pick 族点对='fill' 飞入/点满 3='done'；order 族步对='fill'/5 步完='done'——plant 'planted' 先例的连选返回值族）；**order 族驱动每步重读 quiz**；教学末步='done'（首题整题完成）；miss=题级（order 跨步续算——b39 crd 先例）。

**语音（16=专属 13+core 3）**：brk_tut_watch/turn/hint/right/wrong 5 + brk_t_birthday/picnic/cardmake/planttree/bagpack/washhand/feedrabbit/bedtime 目标名 8。**实长（_clipdur40.json 实测）**：wrong 2880（=干扰反馈句本体）/right 2736/hint 2160/tut_watch 3408/目标名 max ~1600；**错链下界=wrong 2880+150+300=3330**（wrong 即干扰反馈句，无第二段）；确认链 right 2736+300=3036；order 族连选题步进不重播题面（b38 坑③同构——步进只播换步音）。

## §4 交付与验收（承 batch15-39 流水线全项）

1. 语音预合成：gen_clips.py 扩 batch40 块（ins 13/cbx 16/brk 13）+ALL 登记；**前缀已核：ins_/cbx_/brk_ 零占用（cal_ 被 b26 calendar 占 5 同名键已弃用改 cbx_）**
2. 题表先验脚本验算 _verify_spec40.py（交付前跑）：ins LEGS 推导律+同关 anim 互异+ch4 混合占比/cbx 好卡唯一+干扰互异+情境句互异/brk 40 卡唯一归属+干扰 ∉ 目标集+定序表完备+同关目标互异
3. 3 agent 并行（参照：ins→crd 降坡+libr 封闭表/cbx→comfort 情景句+thanks 好卡/brk→libr 题表+plant 排序连选）；任务书必带：§0 承用清单逐条+N1-N4+钩子表（step 语义列）+estMs 实长窗+verify ⑨ 字面真源核对+**_selftest.py 必带（N3）**
4. 门禁 gate_common40.py（INS/CBX/BRK；教学末步 picked/picked/done）→ 探针（含真实点击）→ verify_batch40.py（T1-T11+T9b；独立表 N1 rotate 口径；T4 python 独立复算 dch_reseed 对账）
5. 两级入口 117→120（三段末卡后）+href 扫描 → verify_final40.py R1-R8（R8 真实路径推进）→ 审查+试玩并行 → 修复闭环 → 收官 **120/120 全线完成**

## §5 反方审查+试玩修复记录（收官回填）

### §5.1 反方审查（REPORT-REVIEW-b40.md：fatal 0/major 0/minor 8）+修复闭环
- **b39 两大 major 模式本批均未复发**：锁窗总窗口径三款实算成立（漂移注入 3/3 拦截+页内取证 13/13）；真实 DOM 点击证据链三款齐备（_selftest pg.click+绑定链+第三条独立 stub voice 取证路径）。
- 偏离裁决 13 条全裁（§2.3）：ins 科普句挂错链=SPEC 确认链数值锚唯一自洽解（m-6 记录）/题面删「这是」=core queue 弃尾语义强制（m-7 句式定版：judge 尾「{动物名}呀，它是昆虫还是蜘蛛？」/legs 尾「{动物名}的腿有几条呀？数一数」）/cbx 确认链两段动态窗页内坐实（B2 取证：queue=[cbx_right, cbx_g_breath] 真播）/label 5-6 字=定表真值源压倒降坡指引/brk watch 用 planttree+celebrate 500ms+语序同 ins 根因，全部合理。
- minor 处置：m-1（cbx/brk 首错锁断言漏 140 尾窗——与 ins 不对称）4 处修为 `SHAKE_MS*1+140 <= wrong+150` 总窗口径+rebuild+复验 12/12×2 绿；m-2/m-3（SPEC 加法笔误 6638→真值 6138/键标错 6834→真值 6258）§1/§2 已勘误，窗保守值保留成立；m-5 补 ins/_src/progress.md；m-8 gate 注释修；m-4（先验脚本装饰断言）不修——临时脚本收官即删；m-6 入 backlog（下批迭代项：全对路径听不到科普，换题间隙加科普并同步数值锚）。

### §5.2 分龄试玩裁决（REPORT-PLAYER-b40.md：142 断言全过+pageerror 0/0/0）
- 三款六步全流程+零阻断：**P1=0/P2=3/P3=6，零代码修复**（P2 全为建议非必改，入 backlog）。
- 分龄终评：ins 4.5（前两章放手，ch4 混合建议陪读）/cbx 4.0（两选放手，三选建议陪读）/brk 4.5（放手独玩）。
- P2 backlog：①cbx 中性卡与坏卡共用错链首段（分级全靠尾句承担）②brk 单关 101-115s 耐心上界（观测成立再收开题窗）③cbx miss≥2 救援并入情境句重播。
- 时长实测：ins 58-68s/cbx 65-72s/brk 101-116s（单关）；错反馈不泄答案+豁免窗急点不罚+自恢复+星值链诚实三款 DOM 实证。

### §5.3 终验（2026-09-12，120/120 全线完成）
- 复验 12/12×3（修复后终态 cbx/brk 重验 12/12×2）；R1-R8 首轮 8/8（修复前基线）+终态 8/8（SKIP_R13=1，R1-R3 由终态复验覆盖）；插卡 120+3+href 全可达。
- **batch40 交付三款：ins 昆虫还是蜘蛛（5-6 常识科学）/cbx 冷静工具箱（6-7 SEL 元认知）/brk 问题拆解小博士（7-8 信息素养）——90→120 扩容计划全部完成。**


