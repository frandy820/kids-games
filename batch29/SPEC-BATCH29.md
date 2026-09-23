# SPEC-BATCH29 · 6-7 岁三款（身体英语 / 古诗跟读 / 单词拼图）契约 v1（2026-09-10）

对象：6-7 岁收尾批（6-7 段 #28-30）。目录 `batch29/bodyen|poem|wordpuz/`。
结构照 batch1-28：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch28/conserve/_src/（变换演出+verify ⑤ 帧内容断言范式+救援命名函数）、batch28/coder/_src/（run 题逐卡驱动+卡池多重集 DFS+殊途同达）、batch16/spellen/_src/（字母操作+英语词发音 AnaNeural+首字母亮提示）、batch17/poemfill/_src/（古诗库+pf_poem 整诗音频先例——本批 poem 逐句音频独立新建勿复用整诗）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-69 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b28 定版，一项违反=审查 Major 起步）：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)`）；B. 救援钟双锚：14s 方向级独立节流锚 lastDir（不得重置 lastAct）+30s 答案级 ≥20s 独立节流；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]），生成关 nextHint 实算 `genLevel(f+1).dch-1` 禁 (ci+1)%4；G. queue 拼播链后窗=链总实长+300；H. 判对/奖励窗按实测 clip 时长+300；TTS 拼句窗=estMs 全字符口径 `len*345+600`+build 静态断言「窗≥estMs」；I. 错反馈链豁免窗 wrongChainUntil（**仅链起播时设**——sayW 返回是否入队，节流跳过不设窗，b28 m2 精确化；救援 interval 早退守卫，startLevel 重置 `lastWrongVoice=0; wrongChainUntil=0`，build 静态断言）；J. 错反馈语义句全程保留（flat≥3 只 10s 节流禁切通用 clip）+节流锚 startLevel 重置；K. rescueTick 面板在场守卫 `if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;`——**救援 tick 必须命名函数 rescueTick()（b28 m4，供源码级断言）**；L. TTS 数字/量词映射表覆盖封闭集全量值，量词前 2 用「两」，verify 全量值输出断言禁 undefined；**M（b28 新立）. 变换演出族（分相位渲染的题面）verify 必带帧内容断言**——相位标签之外须断言帧内元素计数/内容与 SPEC 真值一致（b28 M1「数值层/相位标签/帧内容三层缺第三」教训）**〕**

70. **bodyen 身体英语真值**（本批新增）：**词封闭 8**（head 头/eye 眼/ear 耳/nose 鼻/mouth 嘴/hand 手/arm 臂/leg 腿——SVG 小兔身体图高亮该部位，与 werden 动物词差异化）；**题型两族**——**hear**（播英语词音 → 4 部位图卡点选；英语音=en-US-AnaNeural 女童声）与 **see**（部位高亮图 → 4 英语单词文字卡点选）；**近形对封闭 3**（arm↔leg 三字母尾近/hand↔head 首近/eye↔ear 前两字母近）——ch3+ hear/see 题干扰近形必在场（verify 断言；其余词无近形对不得为 ch3+ 真值）；章：ch1 hear 4 候选/ch2 see 4 候选/ch3 混出+近形干扰/ch4 生成混合（seeded 词序）；每关 5 题；候选互异含真值；确定性 seeded `mulberry32(flat*7919+<本批常量>)`；星级=miss 口径（0=3★/1-2=2★/≥3=1★）；错反馈语义：hear 错→「再听一遍这个单词」（点重听按钮同句）；see 错→「再看看它指的地方」（方向级=部位图再 pulse 高亮）；**题面句固定 2 条**（hear=bod_q1'听一听，点出它的英语'，see=bod_q2'看一看，选出它的英语'——听清题面即可作答，英语词音紧随）；判对确认句=**bod_right'点对啦，真棒'+英语词音拼播（§1 语音表为准——本条原稿「对啦，这是 eye」措辞作废，2026-09-10 审查 m2 勘误）**；**词音段恒在 keyless TTS 段之前**（core.js queue 弃尾语义：keyless 段播完即弃余段——b29 审查 Mj-1 立规，clip 段不得排 TTS 段后）
71. **poem 古诗跟读真值**（本批新增）：**诗封闭 5**（五言绝句负担轻：yie 咏鹅/jys 静夜思/cx 春晓/mn 悯农/dgjl 登鹳雀楼——诗目与 poemfill 重叠但**逐句音频独立新建**，禁复用 pf_poem 整诗 clip）；**行池**=每诗 4 行（五言 4 句，行文本与诗原文严格一致）；**题型两族**——**next**（出示上一行文字卡+读其音频 → 「下一句是哪一句」4 行卡点选）与 **hear**（播某行音频 → 「听一听，是哪一句」4 行卡点选，卡=行文字）；**数学先验**：行候选互异且 ⊆本诗行池（4 行封闭）；next 题 4 候选=池全集（封闭集恒全摆家族范式，conserve 同例——「池去掉上行仅剩 3 行」与「4 候选互异⊆4 行池」不相容，2026-09-10 poem 交付定版：上行作干扰在场，干扰全集=池-{真值}恰 3 个全在场，answer=prevLine+1 且 prevLine∈[0,2]——尾行无下一行不出题）；hear 题真值=音频行；**重听按钮定版（2026-09-10 审查 m1 勘误）=播 [行音, poe_q_hear] 读题链（不播语义句——比「同句」更直接，儿童点重听即想再听行）**；章：ch1 next 2 候选/ch2 next 4 候选/ch3 hear 4 候选/ch4 生成混合（seeded 行序）；**关-诗映射**：静态 20 关=诗轮换×难度（flat%5=诗 idx，dch=1+flat//5——每诗见全四档难度）；每关 5 题；确定性 seeded；星级同上；错反馈语义：next 错→「再读读上一行，找找接下来那句」（方向级=上行卡再 pulse）；hear 错→「再听一遍这一句」（重听按钮同句）；**配画**=每诗 1 幅主题 SVG（咏鹅=白鹅浮水/静夜思=床前月光/春晓=落花小鸟/悯农=锄禾/登鹳雀楼=落日楼宇——背景常驻题面，承载诗意维度非装饰）
72. **wordpuz 单词拼图真值**（本批新增）：**词封闭 20**（3-4 字母：cat dog sun hat bed pen ten map cup car bus box fox egg ant eye arm leg hand star——**egg 含双 g 重复字母=多重集范式专项**；hand 实为 4 异字母（2026-09-10 交付勘误，原稿笔误）；与 bodyen 词重叠 eye/arm/leg/hand 属有意复习锚）；**玩法**：目标词=插图+中文提示（cat=猫图+「猫」）→ 字母卡乱序 → 点下一个所需字母=填入槽位（字母飞入，返回 'moved'）→ 全部填满=词完成（'right'，拼播英语词音确认）→ 末题 'done'；点非所需字母=wrong+miss+wig（**多重集语义：重复字母点任一同字母卡均合法**——同 coder 殊途同达）；**干扰字母**（ch3+）：池=目标词字母多重集+1 干扰字母（非目标词字母）——点干扰=wrong+miss；章：ch1 3 字母无干扰/ch2 4 字母无干扰/ch3 +1 干扰字母/ch4 生成混合；每关 5 题；确定性 seeded；星级同上；错反馈语义：wrong→「看看图画，想想怎么拼」+miss≥2 首字母槽亮（sp_first 先例）；**数学先验**：池多重集=目标词±1 干扰；词完成判定=槽位串接===目标词；池恒可拼出目标（干扰不破坏——多余可剩）；题面句=wpz_q'看图拼单词'；判对确认句=英语词音+「拼对啦」

## §1 bodyen 身体英语（听力辨词+词形认读）

**玩法**：小兔身体大图（SVG，题面高亮目标/候选部位）+图卡/词卡点选。
- 题型（4 章）：ch1 hear / ch2 see / ch3 混出+近形 / ch4 混合
- 教学：watch=幽灵手指点 eye 图卡（播 eye 音→点中）「听英语，点身体」→帮/独；`__beDemoR`
- 钩子：`BE = { get currentLevel, get quiz(){ kind('hear'|'see'), ask(目标部位 id), opts[](图卡 {part} 或词卡 {text}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`
- 语音：bod_tut_watch'看！听英语点身体'/bod_tut_turn'你来点一点'/bod_hint'再听一遍想一想'/bod_right'点对啦，真棒'/bod_wrong'再想一想'/bod_q1'听一听，点出它的英语'/bod_q2'看一看，选出它的英语'（**前缀=bod_ 已核 manifest 无占用**；词音 bod_w_<en>×8=en-US-AnaNeural；确认句英语词拼播尾段）

## §2 poem 古诗跟读（顺序记忆+听辨认行）

**玩法**：诗主题配画背景+行文字卡点选；hear 题音频=晓晓读该行。
- 题型（4 章）：ch1 next 2 候选 / ch2 next 4 / ch3 hear 4 / ch4 混合；关-诗映射 flat%5=诗、dch=1+flat//5
- 教学：watch=咏鹅首行卡+音频→幽灵手指点第二行「听一句，找下一句」→帮/独；`__pmDemoR`
- 钩子：`PM = { get currentLevel, get quiz(){ kind('next'|'hear'), poem(诗 id), prevLine(next 题上行 idx 0-3|null), audioLine(hear 题音频行 idx|null), opts[](行卡 {line:行文本, idx:行号}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`
- 语音：poe_tut_watch'看！听一句古诗'/poe_tut_turn'你来找一找'/poe_hint'读读上一行，想想下一句'/poe_right'找对啦，真厉害'/poe_wrong'再读一读想一想'/poe_q_next'下一句是哪一句'/poe_q_hear'听一听，是哪一句'（**前缀=poe_ 已核无占用（pf_=poemfill 不撞）**；行音 poe_line_<pid>_<n>×20=晓晓；上行/音频行朗读复用行音）

## §3 wordpuz 单词拼图（字母序拼词+多重集）

**玩法**：目标词插图+中文提示+槽位行+字母卡乱序点选填槽。
- 题型（4 章）：ch1 3 字母 / ch2 4 字母 / ch3 +1 干扰 / ch4 混合
- 教学：watch=幽灵手指按序点 c→a→t 槽位填满（拼播 cat）「看图，拼单词」→帮/独；`__wpDemoR`
- 钩子：`WP = { get currentLevel, get quiz(){ word(目标词), zh(中文), pool[](字母卡 {ch,used}), slots[](已填序), answer(下一所需字母——多重集语义下为字母而非下标), step, miss }, tapLtr(i), start(flat), autoSolve() }`——tapLtr 返回：所需且未满 'moved'/词完成 'right'/末题 'done'/非所需 'wrong'/已用卡 'false'/越界 null
- 语音：wpu_tut_watch'看！拼出小单词'/wpu_tut_turn'你来拼一拼'/wpu_hint'看图想一想'/wpu_right'拼对啦，真聪明'/wpu_wrong'看看图画想一想'/wpu_q'看图拼单词'（**前缀=wpu_ 已核无占用（wrd_/wen_/wor_ 三近邻不撞）**；词音 wpu_w_<word>×20=en-US-AnaNeural）

## §4 交付与验收（承 batch15-28 流水线，含 b28 三条门禁）

语音预合成（gen_clips.py 扩 batch29 块：bod_ 15 条（通用 7+词音×8）/poe_ 27 条（通用 7+行音×20）/wpu_ 26 条（通用 6+词音×20）=**68 条**——**前缀 bod_/poe_/wpu_ 已核 manifest 全 84 前缀无占用（b28 撞前缀双事故立规：新批前缀先查）**）→ 3 agent 并行（任务书必带：契约 A-M 逐条（**I 起播设+K 命名函数+M 帧内容断言=b28 新增**）/§0.70-72 真值数学先验逐条/钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact）→ 首单元门禁（gate_common29.py：BE/PM/WP 钩子映射）→ 探针定钩子语义（**先 dump 钩子真实形状再写断言——b28 坑③脱敏副本**）→ 独立复验（verify_batch29.py 单文件三款 T1-T11+T9b；真实路径推进由 verify_final29.py R8 承担：预置首日 6 关存档（**add_init_script 内必须 JSON.stringify 包裹**）+`KIDS.calendar.bonusSet(5)`+点火通关+autoSolve flat6-10+断言 dch=[2,2,2,2,3]+flat10 题型∈ch3 族+存档 2-1..3-0）→ 全量回归（verify_final29.py R1-R8）→ 两级入口（batch29/index.html 三卡+主入口 84→87+href 可达扫描）→ 反方审查+6 岁试玩（剧本必含家长面板设多玩数；报告机制推断须开发复核后定案）→ 修复闭环 → 收官（6-7 段 **30/30 段满**，总 87/90）

**实长表（浏览器 Audio 实测，2026-09-10；等待窗=实长+300 余量；英语词音窗同口径；全表 68 条零缺漏）**：
- **bod_**：tut_watch 3168/tut_turn 1824/hint 2184/**right 2256（判对后窗 ≥2556）**/wrong 1656/q1 2952/q2 2952；词音 bod_w_*：head 1344/eye 1296/ear 1392/nose 1536/mouth 1440/hand 1512/arm 1440/leg 1392（**max 1536**——确认句拼播尾段窗按词 max+300）
- **poe_**：tut_watch 2904/tut_turn 1776/hint 3096/**right 2472（判对后窗 ≥2772）**/wrong 2232/q_next 2136/q_hear 2472；行音 poe_line_*（晓晓读单行）：**max 2424**（题面「上行朗读/听音」窗=行实长+300；hear 题=音频行实长+读题窗复合）
- **wpu_**：tut_watch 3048/tut_turn 1824/hint 1896/**right 2496（判对后窗 ≥2796）**/wrong 2256/q 2136；词音 wpu_w_*（AnaNeural）：**max 1608**（判对拼播链=right clip+150+词音+300）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

## §5 反方审查+试玩修复记录（2026-09-10）

- **Mj-1（major，bodyen，已修）**：core.js queue 弃尾语义（keyless 段 TTS 播完即 return 丢余段，design/core.js:101-104）×bodyen 词音段排 TTS 段后=hear 错反馈与重听两路径词音永播不出。修=词音前置 TTS 恒链尾（错链 `[bod_wrong, bod_w_*, {keyless}]`/重听 `[bod_w_*, {keyless}]`，链长不变 7152≤7200）+verify keylessLast 动态断言+build 静态断言双落。**全流水线 stub 发声=盲区（审查从盲区审出）——新立家规：拼播链 clip 段不得排 keyless TTS 段后（b30 起带）**
- m1 poem 重听=读题链 [行音, poe_q_hear]（§0.71 勘误定版）/m2 §0.70 确认句以 §1 语音表为准（勘误注回填）/m3+m5 wordpuz 注释陈旧修正/m4 契约 E 断言口径三款不齐=家族级观察登记
- 修复后全链：verify 12/12×3+R1-R8 8/8 重跑全绿+Mj-1 修复真实路径实证（试玩 D 节+主线 verify 页直驱实录双证）
- 试玩（REPORT-PLAYER-6yo-b29.md）：P1 无/P2 无新增/P3×5；三条机制推断复核为设计观察；P3①覆盖层家长按钮被拦并入家族待办（core 层，与 b28 P2-1 同根）
