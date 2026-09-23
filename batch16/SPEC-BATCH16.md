# SPEC-BATCH16 · 7-8 岁三款（阅读小侦探 / 英语拼写 / 成语配对）契约 v1（2026-09-08）

对象：7-8 岁（一二年级：识字量 ~1500、拼音熟练、英语一年级起步（字母+简单词）、成语故事启蒙）。目录 `batch16/read|spellen|idiom/`。
结构照 batch1-15：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch15/cashier/_src/（点选托盘+提交主路径+币盘先例）、batch15/logicwho/_src/（点选卡+干扰项+线索卡排版）、batch14/blocks/_src/（SVG 造型+几何精确）。

## §0 共同门禁（§0.1-0.30 全承 batch15 原文，一项不满足=不收；31-33 本批新增）

1-30 条照 SPEC-BATCH15.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/文字允许/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/晃动防重入/演示实证/币制/唯一解/有解性——其中 §0.28-0.30 为 batch15 款专属不适用本批）。

31. **read 短文自洽**（本批新增）：每题短文与题目参数同源生成——正确项在文中**唯一成立**、两个干扰项在文中必不成立；verify 须独立复算（分源：verify 侧自带判定逻辑，禁复用游戏生成器的「正确项」字段自证）。短文正文朗读走 KIDS.voice.say TTS 兜底（长文本豁免 clip 化——§0.23 仅要求题句/选项 clip）；听读按钮=主动学习动作重置救援钟（§0.7a 口径）
32. **spellen 发音 clip**（本批新增）：每个单词的发音=预合成英文音频 clip（key `sp_word_<word>`，与中文 clip 同走 KIDS.voice.play(key) 通道，缺 clip 时禁 TTS 兜底朗读英文——中文 TTS 读英文=事故，宁可不播并 console.warn）；拼对反馈句/教学句=中文 clip；字母名反馈走中文 TTS 兜底（"a、p、p、l、e"逐字母）豁免 clip 化。词展示一律小写（一年级课本口径）
33. **idiom 图意一致**（本批新增；**r16 难度改造后随玩法退役→§3-r16 新玩法**）：每条成语的 SVG 图意须语义可辨（去掉文字只看图能猜出成语内核——自检清单逐条勾）；干扰图=库内其他成语的图（天然互异禁重复同图）；成语读音 clip `idm_t_<idx>` 与释义白话小注（错 2 次后显示，纯文字不 clip）——r16 起读音键位改 `idm_w_<idx>`、图意卡改情境句+文字候选卡

## §1 read 阅读小侦探（短文+理解题；点选项卡款，不灰化）

**玩法**：每题=一张短文卡（2-3 句小故事，小兔子 IP 主角）+1 个问题+3 张选项卡。读文（可点「听读」逐句朗读 TTS）→点选项卡：
- 点对：短文卡打勾收起，下一题（新短文）
- 点错：晃动零惩罚可重点；**短文关键句高亮一下**（提示回看哪里）

- 题型（4 章，game-data.js GEN 词表+模板确定性生成）：
  - ch1 事实细节：文中直接答案（"小兔子的伞是什么颜色"→文中"红色的伞"）；干扰=文中出现过但答非所问的词（蓝色帽子/黄色雨鞋）
  - ch2 顺序因果：先…然后…（"小兔子先去了哪里"）；干扰=事件中的其他地点（后去的/提到但没去成的）
  - ch3 简单推断：文中两句合起来才能答（"天为什么会变暗"→"乌云来了"+"要下雨了"）；干扰=文中单句直述但不构成因果的
  - ch4 人物感受/主旨（"小兔子为什么笑了"→帮了别人很开心）；干扰=表面事件（吃到了萝卜）
- 短文生成：词表（人物 3：小兔子/小猫/小熊；地点 6；物品 8；颜色 4；天气 4）×题型模板 2-3 套/章 → 拼装 2-3 句；**同关 5 题互异**；文本总长 40-80 字/题（一年级 30-60s 可读完）
- 星级：错次口径（0/1-2/更多→3/2/1）
- 救援：题句重读+正确选项卡 breathe（14s，家族口径）
- 教学：watch=演示读文→指问题→点选项→对；帮/独；`__rdDemoR`（§0.27）
- 钩子：`RD = { get currentLevel, get quiz(){ passage(文本), keyLine(关键句 idx), question, options[3], answer, step, miss }, tapOption(i), hearPassage(), autoSolve() }`
- 语音：rd_tut_watch'看！读一读小故事'/rd_tut_turn'你来当小侦探'/rd_hint'读一读故事想一想'；题句=rd_q_*（题型封闭 ~8 句 clip：rd_q_what'小兔子的什么是什么颜色呀'族按模板定稿）；选项词=rd_w_*（词表封闭 ~20 词 clip：颜色 4+地点 6+人物 3+感受词 4+杂 3）；rd_right'答对啦，你真会读'/rd_wrong'再读一读故事'；听读按钮句=rd_listen'我读给你听'（TTS 兜底豁免正文）

## §2 spellen 英语拼写（r16 难度改造 2026-09-16：三题型+60 词；点字母瓦片/选项卡款，不灰化）

**玩法**：三题型混排（每关 8 题，q0 恒 listen 保教学演示范式）——
- **listen 听音拼词**（原玩法）：大喇叭按钮（点=播英文单词发音 clip）+目标格 3-6 格+字母瓦片池（目标词全部字母+干扰字母打乱）。依序点瓦片入格：拼满且对=星星+下一词；拼满且错=晃动+已拼字母**可点退回**（点已拼格=退回该字母到池）
- **missing 缺字母填空**（r16）：词卡亮出大半字母、缺 1-2 位（dch≤2 缺 1 位非首位=保首字母线索；dch≥3 缺 2 位任意）+字母选项卡 3/4 张（互异正确字母集+干扰）。点对=填入当前缺位格，全部空填完=题成；点错=词卡晃动零惩罚（选项不消失可重点）
- **meaning 中文释义→拼写**（r16）：中文释义卡（替位大喇叭）+瓦片池（池规则同 listen）。不自动播词音=**主动拼写回忆**（7-8 岁难度锚：从认读选择升到主动拼写回忆）；底栏「再听」与喇叭可主动听（重置救援钟）；换题自动播释义 clip
- 拼到一半点喇叭=重听（主动学习重置救援钟）；点「提示」=首个未拼对格/当前缺位格 breathe（不自动填入）
- 词库（r16：60 词封闭，4 章 × 15，年级梯度；game-data.js 定稿，小写）：
  - dch1 CVC 热身+CVCe 起步（ch1 起步即见长元词）：cat dog sun hat map bed pig bus / cake make bike kite home nose rope
  - dch2 CVCe 长元词：lake gate name game five nine time bone rose cute wave ride note rice safe
  - dch3 辅音簇：fish tree star frog milk grass bread black green snake brush sleep cloud plant small
  - dch4 双音节：apple tiger water happy pencil orange yellow rabbit flower monkey seven paper sister robot garden
- 题型配比（后 7 题；q0 恒 listen）：dch1 L4M2N1 / dch2 L3M2N2 / dch3 L2M2N3 / dch4 L1M2N4（meaning 占比单调升）
- 干扰字母：瓦片干扰 dch≤2 取 2 / dch≥3 取 3（互异+不在词字母集内+干扰组本身≠完整英文词+全池不 anagram 成另一同长完整英文词——verify 断言）；missing 选项干扰=正确字母集外+词字母集外的常用字母
- **b/d 同形翻转对**（AUDIT-78 ④）：瓦片题词含 b 不含 d→干扰含 d（含 d 不含 b→含 b）；missing 正确字母 b→选项含 d（d→含 b；翻转对=词内可见字母时放弃）。唯一正当剔除陷阱=ride+b=bride（word+bd 拼成另一完整词→池唯一性硬约束优先）
- 时长模型（crd r12 范式）：estMs=s.length×345+600（四方同步）；DECIDE_MS={listen 2600, missing 5500, meaning 3600}/字母或空；ADV_STEP 600；ADV_QUIZ=3015=estMs('拼对啦，你真棒'7 字符)；WORD_SAY_MS 1200；faceMs 分型（listen 5260/missing 4750/meaning 5095+estMs(释义)）；LEVEL_MIN_MS 40000；80 关 modeled 实测最低 142995@flat0（精确断言防回漂）
- 结构（r16 家族惯例）：CH_LEN=8（每关 8 题，配旧档迁移 IIFE：矛盾态=有跨章首关 C-0 缺前章第 6 键 (C-1)-5→一次性整档重置）；STATIC_LEVELS=40（4 章 × 10 关）；verify 独立第 4 script 块
- 星级：错次口径（拼满/选项判错一次=1 错；退回不计错）
- 救援：单词发音重播+首个未拼对格 breathe+对应瓦片/正确选项 pulse 三连（missing=当前缺位格 breathe+正确选项 pulse）；契约 K 面板守卫
- 教学：watch=演示听音→逐字母点选→拼满（q0 恒 listen）；帮/独；`__spDemoR`
- 钩子：`SP = { get currentLevel, get quiz(){ type, word, mean?, tiles?, built?, blanks?, filled?, opts?, step, miss }, tapTile(i), tapOption(i), tapBuilt(i), hear(), autoSolve(), start(flat), get tutorial, get rescues }`
- 语音（131 条=sp_ 中文 8+sp_word_ 英文 60+sp_mean_ 释义 60+core 3）：sp_tut_watch'看！听一听拼一拼'/sp_tut_turn'你来拼一拼'/sp_hint'再听一听这个单词'/sp_right'拼对啦，你真棒'/sp_wrong'听一听再拼一拼'/sp_first'第一个字母亮啦'/sp_missing'看一看，少了哪个字母'(10 字=4050)/sp_mean'看一看中文，拼一拼单词'(11 字=4395)；单词发音=sp_word_* 60 条英文 clip（§0.32 禁 TTS 英文兜底）；释义=sp_mean_* 60 条中文 clip（缺 clip 允许中文 TTS 兜底）；字母反馈=中文 TTS 逐字母（豁免）
- 竖屏三件套：@media (orientation:portrait) 与 body.port 逐条等值双通道；portStyle 判别锚=喇叭横 104/竖 96；_selftest P1b 真竖 800×1180 轮

## §3 idiom 成语填空（r16 难度改造 2026-09-16：情境句+80 条分章+近义辨析；点成语文字卡款，不灰化）

**玩法**：每关 8 题（6 fill+2 near 穿插）——
- **fill 情境句填空**：情境句卡（ctx 大字含 `____` 空位渲染为下划线框+读句喇叭）+4 张候选成语文字卡（答案+3 张**同章**干扰——同义类章语义域迷惑）。点对=空位填入成语四字（绿底收束）+白话释义小注（点对窗巩固）+确认链 `[idm_right2, idm_w_<idx> 读音, TTS 释义]`（keyless 恒尾）；点错=卡晃+错链 `[idm_wrong2, idm_hint2]`（豁免窗 6480）+方向级情境卡 flash 回锚，零惩罚可重点
- **near 近义辨析**（r16 新题型）：**2 选 1**，情境句高度易混——干扰=该成语 `near` 字段指定的**互指对端**（如 郁闷不乐↔无精打采、事半功倍↔事倍功半）。候选恰 2 张（`#cards.k2`），题面指令句独立（idm_q_near）
- 错满 2 次（miss≥2）=答案级：白话小注显示+正确卡 breathe（位置线索不念答案）；flat≥3 错链走 10s 节流、miss===2 force 豁免恰一次
- 库（r16：80 条封闭=5 章×16，按**义类分章**，game-data.js 定稿：idx/id/ch/near/say 白话释义 6-18 字/ctx 情境句 14-28 字含恰一个 `____` 且禁含本体整串）：
  - ch1 动作神态：手舞足蹈 目瞪口呆 抓耳挠腮 东张西望 左顾右盼 大摇大摆 眉开眼笑 捧腹大笑 闷闷不乐 无精打采 笑逐颜开 得意洋洋 绞尽脑汁 镇定自若 大吃一惊 幸灾乐祸
  - ch2 数字成语：一心一意 犹豫不决 三心二意 聚精会神 心乱如麻 十全十美 一鸣惊人 百发百中 一举成名 四通八达 五颜六色 千军万马 杯水车薪 十拿九稳 乱七八糟 一清二楚
  - ch3 动物故事：画蛇添足 井底之蛙 守株待兔 对牛弹琴 狐假虎威 鸡飞狗跳 如鱼得水 惊弓之鸟 亡羊补牢 叶公好龙 老马识途 骑驴找驴 如虎添翼 狗仗人势 鲤鱼跳龙门 鼠目寸光
  - ch4 自然气象：水滴石穿 雪中送炭 锦上添花 瓜熟蒂落 水到渠成 风和日丽 春暖花开 电闪雷鸣 狂风暴雨 秋高气爽 鸟语花香 枯木逢春 雨过天晴 草长莺飞 万物复苏 雨后春笋
  - ch5 道理启示：掩耳盗铃 拔苗助长 自相矛盾 滥竽充数 买椟还珠 刻舟求剑 半途而废 助人为乐 拾金不昧 万众一心 异口同声 多此一举 急于求成 事半功倍 事倍功半 自欺欺人
  - 旧 30 条全部保留（idx 重排：动物/行为/自然/美德→ch3/ch5/ch4/ch5 等义类归位）；每章 near 近义对互指对称（ch1 5 对/ch2-5 各 4 对=21 对，对端恒同章）
- 结构（r16 家族惯例）：CH_LEN=8；STATIC_LEVELS=40（5 章×8 关）；生成关 dch=ri(1,5)（mulberry32 确定性）；**旧档迁移 IIFE**（CH_LEN 5→8+章 4→5 键基变更：矛盾态=有跨章首关 C-0 而缺前章第 6 键 (C-1)-5→一次性整档重置）；verify 独立第 4 script 块
- 时长模型（crd r12 范式四方同步）：estMs=n×345+600（全字符口径）；DECIDE_MS={fill 22000, near 18000}（ctx≤28 硬门禁=voice0 恒≤DECIDE）；ADV_MS 880；LEVEL_MIN_MS 40000；每关 modeled=6×22880+2×18880=**175040 恒值**（verify 精确断言防回漂）；WRONG_CHAIN_MS 6480（错链静态豁免窗）；确认链动态窗 1600+confirmTailMs≥链实长+300
- 星级：错次口径（每关错次 0/1/≥2→3/2/1 星；错链豁免窗内错卡吞不虚计）
- 救援：14s 方向级=重读开题链+情境卡 flash（lastDir 独立节流锚）；30s 答案级=正确卡 breathe+重读（重置 idle）；错链豁免窗让路；契约 K 面板守卫
- 教学：watch=播 idm_tut_watch2→幽灵手指指正确卡→演示点对（真实消耗 q0，`__idmDemoR='right'`）→交接重发同关+顺序链 [turn2, 指令, ctx TTS]；帮（幽灵手指 5s 重演示）/独（首次做对放手）；tutSeen 持久化
- 钩子：`IDM = { get currentLevel{flat,ch,dch,lv,n,step,done,won,locked,demo,misses,stars}, get quiz(){ kind, idx, ctx, optionIds, optionIdxs, answer, nearPeer, step, miss, hinted }, tapCard(i), hear(), async autoSolve(), start(flat), get rescues, get tutorial, nextHintOf(flat) }`
- 语音（90 键=core 3+句 7+名音 80）：idm_tut_watch2'看！读句子选成语'/idm_tut_turn2'你来选一选'/idm_hint2'读一读句子想一想'/idm_right2'选对啦，真厉害'/idm_wrong2'再读一读句子'/idm_q_fill'空格里该填哪个成语呀'/idm_q_near'这两个成语很像，哪个更合适'；成语读音=idm_w_1..80（中文 clip 预合成，build 断言 90 条全注入）；ctx/say=TTS 兜底（豁免 clip 化——长文本口径）；旧 idm_t_1..30+旧 5 句键冻结 games=[] 不注入（wordprob r13 先例）
- 章末预告（家族 F）：CHAPTERS[i].hint=第 i+1 章预告；生成关 nextHint 实算 `GEN_HINTS[genLevel(f+1).dch-1]`（禁章序取模）
- 图意 SVG 随玩法退役（r16 起候选=成语文字卡；§0.33 图意门禁随之作废→读音 clip 键位改 idm_w_<idx>）

## §4 交付与验收（承 batch15 流水线）

- 语音预合成（主会话 gen_clips.py 扩 rd_/sp_/idm_ 中文 88+8 句 + sp_word_* 24 条英文走本机英文 TTS 单独管线）→ 3 agent 并行 → 首单元门禁 → 独立复验（断言从本 SPEC 推导，**禁从实现行为归纳**——b15 M1/M2 教训）→ 全量回归 → 两级入口 → 反方审查+7.5 岁试玩 → 修复闭环 → 收官
