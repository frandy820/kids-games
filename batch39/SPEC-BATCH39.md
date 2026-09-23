# SPEC-BATCH39 · 扩容批 9（贺卡工坊 / 表情温度计 / 电路小灯泡）契约 v1（2026-09-12）

对象：120 款扩容第 9 批（每段各 1 款）。目录 `batch39/crd|etm|cir/`。
结构照 batch1-38：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch38/stamp/_src/（一题多步连盖结构+keyless 题面句——crd 强参照）、batch36/comfort/_src/（情景句+SEL 卡选择——etm 情境卡参照）、batch38/gear/_src/（槽位放置+needSize 唯一匹配+兔子补齐槽——cir 强参照）、batch37/thanks/_src/（降坡 5-6 结构）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-90 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b38 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300；I+I补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流（**写法恒 `cur.flat < 3` 含教学迷你关 flat=-1**）；K rescueTick 面板守卫；L TTS 数字映射表覆盖封闭集全量值（本批无数字 TTS——天然满足，语音表为准）；M 帧内容断言三层；N keyless TTS 段恒链尾（题面句=quiz.say 非队列链——承 b36/b38 明示防误伤）；O 自建 button 显式 color）。b33 三条硬性全承（钩子表 step 语义显式/生成关 dch 策略显式声明/build.py core 注入幂等）。b35 M1：三步完整演示款教学 watch ≤22s 款型分支（单步演示款 ≤16s——本批三款均单步演示款 ≤16s）。b34-b38 坑带入：miss 在 core 判定层的款 guard 须判定前拦+预判与 core 严格同构/verify 页写档 origLS 保护+try/finally/SPEC 先验写前验算数学可满足性+约束互斥检测/钩子表列全 verify 需独立推导的派生池字段/首错演出锁禁覆盖豁免窗（锁≤wrong clip+150——**b39 定版：锁窗断言一律总窗口径=常量×SPEED+尾窗常数全算，禁只断常量**）/探针必须含一次真实点击/MSYS 双引号与 heredoc 吃反斜杠=Write 工具直写脚本/py % 格式串防 JS 注释裸 %〕**

**〔b36 M1 家族缺陷强制项（build 层硬性，违反=审查 Major；三款 build 断言须对称）：①build.py 布局=verify 独立第 4 个 script 块（script[0]=core，script[1]=data 段按实序，**script[2]=纯 data+engine+main（无 verify 字面）**，script[3]=verify）+负向断言 `runVerify not in script[2]`+script[2]/[0] 锚断言；②verify ⑨ 肯定断言检索字面逐条与 main 真源字面核对（具名常量断言写常量定义字面，禁自造推导式字面）〕**

**〔b38 六坑带入（任务书+verify 双侧）：①SPEC 题表先验脚本验算（周期串/字符数/约束互斥/相位可分性——本批：crd 主题契合互斥+etm 情境-情绪/强度唯一+cir 缺口几何唯一，§1-3 各表附验算记录）；②verify 独立表照实现 id 抄录再对账（cloth≠clothes 类笔误防复发——对账前先读实现 data.js 的 id 定版）；③一题多步款（crd 卡内 stage 连选）驱动须按 nstage 连做每步重读 quiz（单步后 step 不动=假卡死）；④章预告统计正则防题级同名字段撞入（枚举黑名单）；⑤R8 类静态关 dch=flat//5+1（seeded 只管 flat≥20 生成关——obs 三款同序列即静态映射佐证）；⑥锁窗断言总窗口径+行为测量法不可归因（测的是错点→对选可成功全链时长，锁值以源码代数+常量断言+负向断言拦截实证三重定案）〕**

94. **crd 贺卡工坊真值**（**5-6 段降坡**，艺术/语言·创意组合；调研 #147 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 落位 5-6 段+降坡条款，b37 thanks/b38 stamp 先例）：降坡三件=ch1-2 两步制卡（底纹+贴纸）+候选 3 枚+祝福语全语音零文字依赖；ch3-4 三步（+祝福语图卡）：**核心=主题契合式组合创作（创作自由与可判定的折中：候选内自由选、判定锚主题）**——小兔子给朋友做贺卡，每步候选 2-3（含契合主题唯一正确+他主题干扰），选对即落位贺卡画布**永久留存**，卡完成=成品展示+送出演出（朋友收卡开心表情）。**与「换装贴贴」差异显式声明（防同质化审查项）**：换装=自由装饰无判定；贺卡=主题契合判定（语义匹配）+成品保存送出叙事+多步组合结构；**与「规律画画」（b38）差异**：周期推理 vs 主题语义匹配（认知域不同）+载体=贺卡成品馈赠。**玩法**：主题池封闭 4 主题（birthday 生日/newyear 新年/thanks 感谢/sorry 道歉）；元素池三列一对一映射（底纹 bg：彩旗纹/灯笼纹/爱心纹/云朵纹；贴纸 st：蛋糕/灯笼/爱心/抱抱熊；祝福语 wish：'生日快乐'/'新年好'/'谢谢你'/'对不起'——图卡+TTS 双通道零文字依赖）；**每题=做一张完整贺卡（题内 nstage 连选：ch1-2 两步/ch3-4 三步——stamp blanks 连盖同构）**，每关 5 题=5 张卡（关内主题轮换）；**数学先验（验算 ✓ §1 表后附）**：每步候选=正确 1（主题专属）+干扰 2（他主题专属物——互斥保证唯一契合）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+857)，域全档成立型）**；星级=miss 口径；教学：watch=幽灵手指（主题句→看候选→点契合项→落位）→点中；turn=你也做一张（帮/独）；seed 857

95. **etm 表情温度计真值**（6-7 段，社交情感·情绪粒度；调研 #125）：**核心=情绪粒度训练（识别→命名→分级——心理健康素养前两级）+温度计量表隐喻（强度可视化：水银柱 3 档）**。**与「安慰选择」（b36）差异显式声明（防同质化）**：安慰=他人情绪的应对行为选择（向外行动）；温度计=**自我**情绪的识别命名与强度分级（向内觉察）+量表隐喻；**与「感谢的话」（b37）差异**：感恩回应（社交行为）vs 情绪识别分级（情绪认知）。**玩法两族**：ch1-2 情绪命名族（情境卡 keyless TTS 叙述+插画→4 选情绪脸：开心/生气/难过/害怕——脸谱大图）；ch3-4 强度分级族（固定情绪=生气的情境→温度计 3 档选 1：有点生气/很生气/要爆发了——水银柱低位/中位/高位+对应脸谱强度化）；**判定=情境唯一锚定（封闭题库：命名族情境-情绪一对一不歧义；分级族情境句强度线索唯一——不小心碰掉=有点/故意抢走=很/弄坏还嘲笑=要爆发 三梯度）**；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+867)）**；每关 5 题；星级=miss 口径；教学：watch=幽灵手指（听情境→看脸谱/温度计→点正确项）→点中；turn=你来指一指（帮/独）；seed 867

96. **cir 电路小灯泡真值**（7-8 段，科学/工程·闭合回路；调研 #164；**K 类锚=「先猜后试」假设检验（承 b38 gear）：放件前先猜哪个能点亮，放上即亮=即时因果验证**）：**核心=闭合回路拓扑判定（电池→导线→灯泡→回电池的完整环路才亮）+电流路径可视化**。**与「齿轮转起来」（b38）差异显式声明（防同质化）**：齿轮=转向奇偶性推理（运动链方向）；电路=**回路连通性推理（能量路径拓扑）+即亮反馈（放对瞬间灯亮——即时因果 vs gear 全链预演）**；判定结构同槽位放置（先例复用降风险）但认知域不同（空间拓扑 vs 代数奇偶）。**玩法**：电路板=电池+灯泡（ch1-2 单灯：3 段导线槽 2 已连 1 缺口；ch3-4 双灯并联板：干路+两支路 5 槽，1 判定缺口+1 兔子补齐槽——gear bunny 先例）+候选 2-3 件（导线 S/M/L 长度档），选对=导线落位+**回路闭合瞬间灯亮动画+电流粒子环流**；选错=导线悬空抖动+错链；**数学先验（验算 ✓）**：候选恒 S/M/L 各一枚→缺口跨距唯一匹配（同 gear needSize 范式）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+877)）**；每关 5 题（关末全板通电+双灯全亮演出）；星级=miss 口径；教学：watch=幽灵手指（观察句→看缺口→点正确导线→灯亮）→点中；turn=你来连一连（帮/独）；seed 877

## §1 crd 贺卡工坊（5-6 段·艺术/语言）

**玩法**：给朋友做一张贺卡，选对每一样新的装饰。
- 教学：watch=幽灵手指看演示（主题句→点契合项→落位）→点中（演示题=birthday 主题）；turn=你也做一张帮/独；`__crdDemoR`
- 钩子：`CRD = { get currentLevel, get quiz(){ theme(本题主题 id：'birthday'|'newyear'|'thanks'|'sorry'), stage(题内步号 0-(nstage-1)), nstage(2|3), col('bg'|'st'|'wish' 当前列), picks[](候选 id 3 枚——盘序自由打乱), answer(契合项下标——verify 独立推导), step(全关题号 0-4), miss, say(题面主题句——keyless 非队列链) }, tapPick(i), start(flat), autoSolve() }`——tapPick 返回：i=answer→'placed'/末题末步 'done'；干扰→'wrong'；演出期 null（真时钟锁）；**步推进=stage+1（非末步），卡完成（末步）=step+1+成品展示演出**
- 主题-元素映射表（封闭——§0.94；verify 独立对账依据）：
  | 主题 | bg 底纹 | st 贴纸 | wish 祝福语 |
  |---|---|---|---|
  | birthday | flags 彩旗纹 | cake 蛋糕 | '生日快乐' |
  | newyear | lant 灯笼纹 | lant2 灯笼 | '新年好' |
  | thanks | hearts 爱心纹 | heart 爱心 | '谢谢你' |
  | sorry | clouds 云朵纹 | bear 抱抱熊 | '对不起' |
- 题库 20 题全表（每题一卡：flat0-19；ch1-2（flat0-9）nstage=2 主题轮换 birthday/newyear；ch3-4（flat10-19）nstage=3 主题轮换 thanks/sorry——**低龄段用熟识主题（生日/新年），大龄段用关系主题（感谢/道歉）——认知坡度**）：
  - ch1：①birthday ②newyear ③birthday ④newyear ⑤birthday
  - ch2：⑥newyear ⑦birthday ⑧newyear ⑨birthday ⑩newyear
  - ch3：⑪thanks ⑫sorry ⑬thanks ⑭sorry ⑮thanks
  - ch4：⑯sorry ⑰thanks ⑱sorry ⑲thanks ⑳sorry
  - 每步候选=本主题正确 1+**异列异主题干扰 2**（如 birthday 的 bg 步=flags+hearts+clouds——干扰取非本主题 bg；st 步=cake+heart+bear；wish 步='生日快乐'+'谢谢你'+'对不起'——**同列取干扰保证视觉可比性**）
  - **先验验算（✓）**：4 主题×3 列元素一对一互斥（无跨主题共属元素——映射表行间无交集）；每步 3 候选同列异主题=唯一契合；干扰选取规则封闭（本列非本主题元素任取 2——seeded 打乱）
- 语音：crd_tut_watch'看！做一张贺卡'/crd_tut_turn'你也做一张'/crd_hint'想想这是给谁的'/crd_right'贺卡真好看'/crd_wrong'再想想主题哦'（**前缀=crd_ 已核 manifest 0 占用 ✓ 2026-09-12**）；主题句=题面 keyless（「给小兔子做一张生日贺卡」等——§1 句表实现定，say 非队列链）；确认链=right 单 clip；错链=crd_wrong+150+crd_hint+300（实长表 §4 定）
- SEL/渲染：候选≥96×96 触摸目标；贺卡画布居中（元素落位动画+永久留存）；**卡完成=成品定格展示 1 拍+朋友收卡开心演出（叙事闭环）**；5-6 岁候选≤3
- **防同质化声明（审查项）**：vs 换装贴贴=自由装饰→主题契合判定+送出叙事；vs 规律画画=周期推理→语义匹配；vs 感谢的话=回应行为选择→多步组合创作——三重差异

**〔crd r12 改造定版 2026-09-15（难度批 r12）——本 r12 块为 crd 真值现行版，上文 v1 主题映射表/钩子 theme 字段作历史存档。改造动因=审计红款 #39（AUDIT-56 行 56）：v1 判定=4 主题静态映射背一遍全对零失误（8 条映射零推理）+实测 84s/关全演出窗（行 87 三 delta 逐条）〕**

**r12 判定=SPEC_TABLE 题表驱动（20 行封闭题表，data 源真值；verify ⑥ 独立重列同构对账+python 侧 verify_batch39 CRD_ROWS 照录）**：行={kind, occ(场合), who(收卡人), nstage, say(线索句), steps[]=[col, correct, 干扰1, 干扰2, h(步型)]}——三 delta：
- **① 偏好线索推理（kind like）**：题面给收卡人偏好线索（「奶奶喜欢云朵和花」→选 clouds/flower 而非主题直配；「朋友怕吵闹」→负面偏好排除喇叭 horn）；WHO_LIKE 封闭 2 人 {grandma: clouds+flower, monkey: hearts+bear}——偏好元素与任何场合默认均不同（per-题 likeMutex：like 步 WHO_LIKE[who][col]≠OCC_EL[occ][col]）→「按偏好选」≠「按场合直配」构成本款核心推理
- **② 元素冲突排除（kind clash）**：冲突项与主题项同屏（新年卡候选含圣诞树 tree/生日卡含白菊花 mum），「这个节日不用它」按场合推理排除；CONFLICT_EL={newyear:'tree', birthday:'mum'}——tree/mum/horn 全表恒非正解
- **③ 祝福语语用适配（kind wish）**：同收卡人不同场合选不同祝福语（奶奶过生日祝 wbd/奶奶生病住院祝 wkang——sick 为 r12 新增场合）；同祝福语判定随场合翻转而非任意祝福都对
- **④ 综合（kind mix）**：每步一型混合（like/theme/clash/wish 步序）
- **章梯度**：ch1 rows0-4 like 两步/ch2 rows5-9 clash 两步/ch3 rows10-14 wish 三步/ch4 rows15-19 mix 三步——认知坡度；dch≤2 池 0-9/≥3 池 10-19（域守恒承 v1）；场合池扩 5（birthday/newyear/thanks/sorry/+sick）
- **元素池**：bg 4 枚承 v1；st 扩 8（+flower 花朵/horn 喇叭/tree 圣诞树/mum 白菊花）；wish 扩 5（+wkang 早日康复——图卡徽记 flower）
- **反启发式翻转锚（verify ⑬ 实锤）**：cake 题0 干扰/题7 正解；bear 题2 干扰/题1 正解；**wbd 题10 正解/题11 干扰（同收卡人 grandma 跨场合=delta③ 表级实锤）**；flower 恒 grandma 偏好正解（恒定性）；翻转锚集 ≥5 元素（含点名 cake/bear/wbd/flags/hearts）
- **歧义防线（M2 收窄口径，2026-09-15 修复）**：h=theme 步（场合直配步）**干扰项**（非正解两枚）∩ WHO_LIKE[who] 两元素=∅（防「按偏好选」与「按场合选」双真值——干扰项层恒成立）；**例外登记：行 13/17（wish/mix 的 sick×monkey）theme 步正解 bg=hearts 本身 ∈ WHO_LIKE.monkey**（正解双理由：按场合直配与按 monkey 偏好同指——该两行唯一解保持、判定无歧义，仅「按偏好选≠按场合直配」在此两步局部弱化为「双理由一致」）
- **步型 h 分流**：h ∈ {like, clash, wish, theme}——错链尾段/方向提示按 h 分流（HINT_OF={like:hintLike, clash:hintNo, wish:hintWish, theme:hint}；sayDirHint 同源）
- **钩子 r12**：`CRD.quiz={scene(题表行号), kind, occ, who, stage, nstage, col, picks[], answer, step, miss, say(线索句), h}`——**theme 字段退役**（渲染锚改 dataset scene/occ/kind/who）；tapPick 返回值/演出锁/步推进承 v1
- **错链豁免窗四链（CHAIN_WIN 真时钟，家族 I）**：{like: 4626, clash: 4554, wish: 4674, theme: 5010}（=wrong 1968+150+hintX+300 精确）；选对窗 CARD_WIN=2316 承 v1；首错锁总窗 1240 ≤ 2118（b39 总窗口径）
- **r12 时长模型（门禁硬断言 verify ⑭+build 字面；estMs 串长变体 `s.length*345+600` 四方同步承 v1）**：每步 dur=max(voiceWin, DECIDE_MS[kind])+CARD_WIN 2316；voiceWin=首步 ENTER 400+estMs(say)+300/后续步 STAGE 400；DECIDE_MS={like:10000, clash:9000, wish:9000, mix:11000}（5-6 岁认知决策推算）；末题卡不计 FINISH 尾（v1 惯例）；LEVEL_MIN_MS=40000——验算：voiceWin 恒 ≤DECIDE（最长句 15 字 6475<9000，语音窗从不撑时长）；like 关 128260/clash 关 118360/wish 关 174940/mix 关 204940 全 ≥40000（40 关 modeled 最低=clash 章 118360）；每关 DECIDE 决策点 10-15 个（两步 5 卡×2/三步 5 卡×3）——84s 全演出窗根治为认知步主体
- **语音 8 键（r12 +3，2026-09-15 实测）**：v1 5 键承（tut_watch 2928/tut_turn 1728/hint 2592/right 2016/wrong 1968）+**crd_hint_like'想想他喜欢什么' 2208/crd_hint_no'这个节日不用它' 2136/crd_hint_wish'想想现在什么事' 2256**（前缀已核 manifest 0 占用；gen_clips.py r12 块登记）；线索句=题面 keyless say（句长域 10-15 字——estMs 预算域）；确认链=['crd_right'] 单 clip 承 v1
- **verify 扩容（game-verify.js 14 单元）**：+⑬ deltaAnchors（表级翻转锚+运行时反直配/冲突排除/语用翻转三点实锤断言）+⑭ duration（40 关 vDur 独立副本 ≥40000+levelDurMs 逐关对账+每步 DECIDE≥voiceWin）；既有 ⑤ 链断言 r12 分流（flat0 首步 h='like'→[crd_wrong,crd_hint_like]）；教学演示行 0=like 偏好题（预算 3300+6475+800+320+2316=13211 ≤16000 承单步演示款口径）
- **共享复验 r12 口径**：verify_batch39.py crd 段=CRD_ROWS 20 行照录（kind/occ/who/nstage/每步三元组）+LBWIN=4554（四链最小）+T11 CHAIN_WIN 对象四值提取（crd 分支——通用常量正则对对象字面量形态回溯假匹配，须前置）；verify_final39.py R4 crd 8 键+R8 CRD_KIND={1:like,2:clash,3:wish,4:mix} kind 判别（CRD_TH 主题判别退役）；verify_voice.py 补 crd 段（core 3+crd_ 8+DIRS）
- **承 v1 不变项**：玩法主体（每题一卡 nstage 连选/候选 3 枚/落位永久留存/卡完成定格+送出/贺卡集/末题卡不送出）；星级 miss 口径；救援双锚；seed 857；静态章池 rotate 取题（题(flat,k)=表行[(flat//5)*5+((flat%5)+k)%5）；生成关 dch=ri(rnd,1,4) 域全档成立；教学三段；存档 v1.0 键 kidsgame_crd；家族契约 A-O 全承

## §2 etm 表情温度计（6-7 段·社交情感）

**玩法**：听一听发生了什么，指一指现在的心情。
- 教学：watch=幽灵手指看演示（听情境→点正确脸谱/档位）→点中（演示题=face 族）；turn=你来指一指帮/独；`__etmDemoR`
- 钩子：`ETM = { get currentLevel, get quiz(){ scene(情境 id), kind('face'|'level'——族标记), text(情境句), picks[](脸谱 id 4 枚 或 档位 id 3 枚——盘序自由打乱), answer(正确下标——verify 独立推导), step(全关题号 0-4), miss, say(情境句——keyless 非队列链) }, tapPick(i), start(flat), autoSolve() }`——tapPick 返回：i=answer→'picked'/末题 'done'；错→'wrong'；演出期 null
- 情绪与档位封闭集：face 族 4 脸（happy 开心/angry 生气/sad 难过/scared 害怕——脸谱大图 SVG 表情语言分明：嘴角方向/眉毛/眼泪/汗滴原型分离）；level 族 3 档（l1 有点生气/l2 很生气/l3 要爆发了——同一脸谱强度化+水银柱低/中/高位）
- 题库 20 题全表（每题=情境句+期望答案；ch1-2 face 族 10 题/ch3-4 level 族 10 题）：
  - ch1（face·熟识情境）：①'朋友送你一朵小花'→happy ②'妹妹把你的积木推倒了'→angry ③'心爱的气球飞走了'→sad ④'打雷轰隆隆响'→scared ⑤'大家一起唱歌'→happy
  - ch2（face·扩展）：⑥'你的画被弄坏了'→sad ⑦'有人对你大喊大叫'→scared ⑧'你搭的高塔成功了'→happy ⑨'玩具被人抢走了'→angry ⑩'迷路找不到妈妈'→scared
  - ch3（level·三梯度）：⑪'有人不小心碰掉了你的蜡笔'→l1 ⑫'有人抢走你手里的玩具'→l2 ⑬'有人弄坏了你的画还笑你'→l3 ⑭'排队时被轻轻踩了一脚'→l1 ⑮'有人一直抢你的秋千'→l2
  - ch4（level·加深）：⑯'你说话总是被人打断'→l2 ⑰'辛苦搭的城堡被故意踢倒'→l3 ⑱'画画时颜料被碰撒了一点'→l1 ⑲'有人撕了你的故事书还做鬼脸'→l3 ⑳'等了很久的玩具又被拿走了'→l2
  - face 族候选=4 脸全出（唯一契合）；level 族候选=3 档全出（强度线索唯一锚定）
  - **先验验算（✓）**：face 族 10 情境-情绪一对一（无歧义情境——「推倒积木」=angry 而非 sad：行为指向明确；验算记录=每情境句含明确行为动词+指向）；level 族 10 情境强度线索三梯度互斥（不小心/轻轻=l1；故意抢/一直=l2；弄坏还笑/故意踢倒=l3——副词与后果双线索，无跨梯度歧义句）
- 语音：etm_tut_watch'看！现在心情怎么样'/etm_tut_turn'你来指一指'/etm_hint'听听发生了什么'/etm_right'你说对啦'/etm_wrong'再听一次想想哦'（**前缀=etm_ 已核 0 占用 ✓——emo_ 被 b25 全套占用（11 键）当场改 etm_，b38 st_ 事故预防首次命中**）；情境句=题面 keyless（上表全文——say 非队列链）；确认链=right 单 clip；错链=etm_wrong+150+etm_hint+300
- 渲染：face 族=情境插画卡（简笔场景）+4 脸谱大图；level 族=温度计立式（水银柱+3 档刻度脸谱）；**错反馈不泄答案：重播情境句+「再听一次想想哦」（方向级=hint 句重读）**；miss≥2 正确项 breathe
- SEL：脸谱≥96×96；档位格高 ≥64px；6-7 岁候选≤4
- **防同质化声明（审查项）**：vs 安慰选择=向外应对行动→向内识别命名；vs 感谢的话=社交行为→情绪认知分级——三重差异（+温度计隐喻独有）

## §3 cir 电路小灯泡（7-8 段·科学/工程）

**〔cir r4 改造定版 2026-09-13（难度批 r4）——本节以下 r4 块为现行契约；后半 v1 玩法（needSize S/M/L 跨距唯一匹配/单缺口/拓扑布景化）已作废（保留备查）。改造动因=审计红旗：与 gear 同构跨距匹配、回路拓扑是布景不是考题、实测 34-45s/关为本段最快档（AUDIT-78 第 10 名）〕**

**r4 玩法（双答制+四题型故障诊断——照 gear v3 先例：先推理预测、答对钉住才开操作）**：
- **双答制（delta 1 题型形态）**：每题两段判定——阶段1 预判答（ch1-3「灯会亮吗」亮/不亮二选；ch4「两盏灯会比一盏更亮吗」更亮/一样亮/更暗三选，预判行按钮组 answerbar）→ 答对 'ok' 进阶段2（picks.dim 解除+预判钉 chip 钉在判定缺口上）；阶段2 选正确元件接缺口。两段全对才推进；阶段1 错='wrong'+miss+专用错链（不泄答案）；阶段1 未答对点元件吞 null（顺序守卫——engTapPart guard `!q._predOk → null`）
- **四题型真值律（delta 1/2/3——verify specPredAns 与 python _verify_spec39r4.py 独立重列，禁调引擎）**：
  - twogap（ch1 两缺口串联修复）：litAns = (second.at !== 'main')——A 变体两缺口都在主环（只接判定位一根不亮=假；两缺口都接对才亮，兔子补第二缺口后灯亮=延迟验证演出）；B 变体第二缺口在死支路（主环只有判定位一个缺口，接好即亮=真；兔子补支路缺口灯不变亮=死支路拓扑教学）
  - fault（ch2 断/短混合诊断）：litAns = !short && blankAt !== 'main'——断路=断口（主路断口→假；死支路断口→真，判定位就在支路上，修好后支路小风扇转）；短路=跨接线（跨在灯两端→假，阶段2=拆线卡「剪掉跨接线」；主环完好但被跨接线旁路=「看起来通但不亮」误解锚）；阶段1 答对即合开关亮真相（即时验证）
  - switch（ch3 开关-灯因果预测）：litAns = !(branch && branch.bridge === 'lamp' && branch.sw)——SW1 支路开关跨在灯两端（合上=短路灯→假；修好后合开关→灯暗真相揭示→支路开关自动弹开（短路禁合教学）→灯亮收尾）；SW2 支路开关跨线段（真）；SW3 开关在主路（真）
  - bright（ch4 串并联亮度判断）：brightAns = branch ? 'same' : 'down'——两灯并联=与单灯一样亮；两灯串联=比单灯更暗；'up'（更亮）=误解干扰项恒非真值；演示动画佐证=修好后两灯齐亮（串联 .on.dim 弱光/并联 .on 全亮）
- **同尺寸干扰（delta 1 审计建议「同尺寸干扰按拓扑排除」）**：decoy ⟺ second.at==='dead'（twogap-B 与 fault-F1，20 题中 4 题）——候选 3 枚=[need(通路导线), 死支路元件(同尺寸,灰标+支路结点徽记), 邻档线]，两根同尺寸候选按尺寸目测失效，须按「选接在灯的通路上的那根」拓扑排除（阶段1 已追过路径）；pick 渲染 .pick.pick-dead 灰标+aria「支路导线」（r4 审查 m-1 勘误：类名记法，非 data 属性）
- **章梯度**：ch1=twogap（板 sgl 单灯 4 主槽+可选死支路；「接好这一根，灯会亮吗」10 字窗 4350）/ch2=fault（板 sgl+主路开关；「闭合开关，灯会亮吗」9 字窗 4005）/ch3=switch（板 sgl+支路开关；「修好闭合开关，灯会亮吗」11 字窗 4695）/ch4=bright（板 sr2 两灯串联 4 槽/tw 并联 5 槽复用；「两盏灯会比一盏更亮吗」10 字窗 4350）——4 章×5 题=20 题封闭；生成关四型混出（dch=ri(rnd,1,4) 承旧制）
- **布局记法 r4**：主环槽序列 'B??L'（4 槽：B 电池侧/L 灯侧/? 普通；sgl/sr2 板）与 'B??L?'（5 槽：tw 并联板承 v1）；死支路缺口槽追加为末槽（index 4，type blank|bunny）；blankAt='main'|'dead'（fault-F2 判定位在支路）；second={at:'main'|'dead', i, size}|null；branch={bridge:'lamp'|'seg', sw, lamp}|null（bridge=支路跨什么：'lamp' 跨灯两端/'seg' 跨线段）；short 布尔（跨接线在场）；sw 布尔（主路开关在场，fault/switch-SW3 章 true）
- **题库 20 题全表 r4（真值源 game-data.js SPEC_TABLE；verify specTable/python _SPEC 双独立对拍；行号=章池索引；F3 need=null 拆线卡题）**：
  - ch1（twogap）：①A blank1 M sec{main,3,L}假 ②A blank2 L sec{main,0,S}假 ③B blank0 S sec{dead,S}真 ④A blank3 M sec{main,1,S}假 ⑤B blank2 M sec{dead,M}真
  - ch2（fault）：⑥F1 blank1 M sec{dead,M}假 ⑦F2 blankDead L 真 ⑧F1 blank3 S sec{dead,S}假 ⑨F3 short need=null 假 ⑩F2 blankDead M 真
  - ch3（switch）：⑪SW1 blank2 M{lamp,sw}假 ⑫SW2 blank0 S{seg,sw}真 ⑬SW1 blank1 L{lamp,sw}假 ⑭SW2 blank3 M{seg,sw}真 ⑮SW3 blank2 S 无支路 真
  - ch4（bright）：⑯SR blank1 M 更暗 ⑰PR blank0 M 一样亮 ⑱SR blank3 L 更暗 ⑲PR blank0 L 一样亮 ⑳SR blank0 S 更暗
  - **分布先验（_verify_spec39r4.py 验算 ✓）**：litAns 真 7/假 8（ch4 除外）；decoy 4 题（③⑤⑥⑧）；cut 1 题（⑨）；SR 3/PR 2；need 域 M9/L5/S5+cut1；blank 位 0-3 全覆盖+支路 2 题
- **钩子 r4**：`CIR = { get currentLevel{flat,ch,dch,lv,n,step,done,won,miss,stars}, get quiz{kind('twogap'|'fault'|'switch'|'bright'), layout, slots[]({i,fixed,part,on,type('fix'|'blank'|'bunny')}), blank, blankAt('main'|'dead'), need('S'|'M'|'L'|null), picks[](3 枚 {t('wire'|'cut'),size,dead}), answer, deadIdx(同尺寸死支路干扰下标 -1=无), second({at,i,size}|null), branch({bridge,sw,lamp}|null), short, predAns(阶段1 真值选项——r4 判定锚), litAns, brightAns('down'|'same'|null), phase(1|2), step, miss, say}, tapPred(d), tapPart(i), start(flat), autoSolve()(两段 taps=题数×2), reread(), get tutorial }`（真实页同暴露——b29 坑⑥；predAns 初版漏暴露=verify ⑤④⑩ 连锁假失败，已修 2026-09-13）；tapPred：d=真值→'ok'（phase→2）/干扰→'wrong'/豁免窗内错答吞 false/演出期·阶段2·已答 null；tapPart：对非末题→'lit'/末题→'done'/干扰→'wrong'/阶段1 未答 null/豁免窗内错点吞 false/演出期·越界·已答 null
- **语音 7 句（r4 +2，浏览器 Audio 实测 2026-09-13）**：cir_tut_watch'看！电路连起来'(2856)/cir_tut_turn'你来连一连'(1824)/cir_hint'看看哪里断了'(1968)/cir_right'小灯泡亮啦'(1968)/cir_wrong'还没连上哦'(1848)/**cir_pred_wrong'不对哦，顺着电线找一找'(3072)/cir_bright_wrong'想想一盏灯有多亮'(2544)**（新增 2 键已核 manifest 无占用；gen_clips.py batch39 cir 段登记；manifest 对账 1579→1591=+2 本批键+10 文件在盘旧档缺登记键被根因重建收编）；题面句=章档 keyless say（ch1-4 句见章梯度——家族 T 窗=estMs(字数)+300）；确认链=['cir_right'] 单 clip；错链三型：元件=[cir_wrong,cir_hint]、预判=[cir_pred_wrong,cir_hint]、亮度=[cir_bright_wrong,cir_hint]
- **窗常量 r4（实长回更）**：元件错链 WRONG_CHAIN_WIN=4266（=1848+150+1968+300 承 v1）/预判错链 PRED_CHAIN_WIN=5490（=3072+150+1968+300）/亮度错链 BRIGHT_CHAIN_WIN=4962（=2544+150+1968+300）——真时钟不随 SPEED 提速；三首错锁（b37 R3=clip+150 顶格，禁叠 +140 尾窗——b38 R1 总窗口径）WRONG_LOCK_1=1998/PRED_LOCK_1=3222（=3072+150）/BRIGHT_LOCK_1=2694（=2544+150）；WRONG_LOCK_2=1000；判对演出 LIT_MS=1400+FLOW_MS=1600（3000 ≥ 1968+300=2268）；PRED_OK_MS=500（阶段1 答对钉住窗，+140 演出尾）；REVEAL_MS=1800（开关合上亮真相窗）；CUT_MS=1000（拆线演出窗）；FULL_WIN=2400；教学延窗 watch 3156/turn 2124 承 v1
- **教学 r4（两步演示分账，watch 段 ≤16s 单步演示款口径）**：watch 3156+题面句窗 4350+ghost①移入 800+press 320+tapPred'ok' PRED_OK_MS 500+140+ghost②移入 800+press 320+demo 演出 1400+1600——ghost 先指预判按钮（不亮）、再指正确导线（双答两步分流）；turn 单题先答预判再放对→独
- **渲染 r4**：预判行 answerbar（亮/不亮=灯亮/灯灭图标；更亮/一样/更暗=亮度三档图标）+阶段2 picks.dim 解除+预判钉 chip；开关=板上闸刀（.sw .closed 合上动画）；断口=断头毛边（.gapline 加毛刺标记）；跨接线=跨灯弧线红纹（data-anim="short"，拆线卡移除后淡出）；死支路=支路走线+灰结点+小风扇（修好转动）；串联暗灯=.lamp.on.dim（弱光晕无光芒）vs 并联 .on 全亮（亮度判断演示锚——verify DOM 断言）；错反馈方向级=主路走线 .trace 流光一遍（阶段1）或缺口两端触点 lit（阶段2）
- **单关净时长分账（≥50s 硬指标）**：每题名义窗=题面句 4005-4695+钉住 640+判对演出 3000+（ch2 合开关 REVEAL 1800/ch3 合开关揭示 1800）≈ 7.6-9.2s ×5 题=38-46s+关末 FULL_WIN 2400+celebrate 3020≈43.4-51.4s 名义演出窗，+每题 2 决策点（预判+选件）×5=10 决策/关（v1 为 5）——思考占比由双答制顺序守卫结构性保证（verify ⑤ 断言阶段1 未答点元件=null）
- **承 v1 不变项**：星级 miss 口径（0=3★/1-2=2★/≥3=1★ 永不 0 星）；救援双锚（14s 方向级/30s 答案级——phase 感知：phase1=正确预判按钮/phase2=正确元件 breathe）；seed 877；生成关 dch=ri(rnd,1,4) 域全档成立型（mulberry32(flat*7919+877) 首随机数先取+档池 seeded 无放回抽 5）；家族契约 A-O 全承（E 教学特例 sv.cir.tutSeen/C 存档键 kidsgame_cir）；静态关章池 rotate (lv+k)%5 承旧制

**玩法**：电路断了一处，选对导线让小灯泡亮起来。
- 教学：watch=幽灵手指看演示（观察句→点正确导线→灯亮）→点中；turn=你来连一连帮/独；`__cirDemoR`
- 钩子：`CIR = { get currentLevel, get quiz(){ slots[](导线槽序列：{i, fixed, part(已放导线档 'S'|'M'|'L'|null), on(通电布尔)}), blank(当前判定缺口位置号), picks[](候选导线档 2-3), answer(正确候选下标), needSize(判定缺口跨距档——几何匹配真值), bunny(兔子补齐槽位置号 -1=无), bunnySize, step(全关题号 0-4), miss, say(观察句——keyless 非队列链) }, tapPart(i), start(flat), autoSolve(), reread() }`——tapPart 返回：i=answer→'lit'/末题 'done'；干扰→'wrong'；演出期 null
- 回路律（§0.96 数学锚——verify 独立复算依据）：**回路闭合=全槽有件（fixed+判定位+兔子位）；闭合即全链通电（slots[*].on=true）+电流粒子环流动画**；缺口跨距档=needSize（表定），picks 恒 S/M/L 各枚 → 唯一正确候选=picks.indexOf(needSize)，干扰=偏大/偏小悬空
- 题库 20 题全表（布局记法：串字符即槽序列——'B?L'=单灯 3 槽（B 电池侧/L 灯侧/? 缺口位由 blank 指）；'B??L?'=并联 5 槽；**记法串字符数=槽数（b38 gear 笔误教训——本表已逐行验算 ✓）**）：
  - ch1（单灯 3 槽·1 缺口）：①blank1 need M ②blank2 need L ③blank0 need S ④blank1 need L ⑤blank2 need M
  - ch2（单灯·预判深问）：⑥blank0 need M ⑦blank1 need S ⑧blank2 need L ⑨blank1 need M ⑩blank0 need L（观察句「猜猜哪根能点亮」承载）
  - ch3（并联 5 槽·1 判定+1 兔子补）：⑪blank2 need M 兔1 补 S ⑫blank3 need L 兔2 补 M ⑬blank2 need S 兔1 补 L ⑭blank3 need M 兔2 补 S ⑮blank2 need L 兔1 补 M
  - ch4（并联+双灯全亮要求）：⑯-⑳ 同 ch3 池轮换（blank/needSize 对位轮换；关末双灯全亮+电流双路环流演出）
  - **每关 5 题=5 个判定缺口（关内 STATIC_LEVELS=20+rotate 取题——b38 先例）；先验验算（✓）**：picks 恒 S/M/L→needSize 唯一匹配；blank 槽 part=null（fixed 槽预置）；bunnySize 恒≠needSize（视觉可辨）
- 语音：cir_tut_watch'看！电路连起来'/cir_tut_turn'你来连一连'/cir_hint'看看哪里断了'/cir_right'小灯泡亮啦'/cir_wrong'还没连上哦'（**前缀=cir_ 已核 0 占用 ✓**）；观察句=题面 keyless（「看看电路哪里断了」「猜猜哪根导线能点亮」——§3 句表实现定，say 非队列链）；确认链=right 单 clip；错链=cir_wrong+150+cir_hint+300；**方向级反馈=错时高亮缺口两端触点+「看看哪里断了」（不亮正确件本体）**
- 渲染：电路板=SVG 环形（电池符号+灯泡+导线槽）；**放对=落位瞬间灯亮（即时因果——K 类核心）+电流粒子沿环流动**；双灯板=干路分叉两支路各自环流；「先猜后试」：放置前候选悬停预览虚影（非判定）
- **防同质化声明（审查项）**：vs 齿轮转起来=代数奇偶（转向推理）→拓扑连通（回路推理）+即亮反馈 vs 全链预演；vs 循环指令=抽象序列→物理因果——三重差异

## §4 交付与验收（承 batch15-38 流水线）

语音预合成（gen_clips.py 扩 batch39 块：crd_ 5 条/etm_ 5 条/cir_ 5 条=**15 条**；前缀 crd_/etm_/cir_ 已核 0 占用 ✓ 2026-09-12）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+b33 三条硬性+b34-b38 坑带入（**首错锁≤wrong+150 且断言总窗口径/探针含真实点击/J 写法恒 cur.flat<3/build 三款断言对称/题表先验脚本验算记录/verify 照实现 id 抄表/crd 一题多步连做驱动**）+§0.94-96 先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>/契约 M 帧内容断言（crd 元素落位+etm 脸谱选中+cir 灯亮 DOM 断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/无头测试 --mute-audio+stub 发声/错链豁免窗对选放行语义）→ 首单元门禁（gate_common39.py：CRD/ETM/CIR 映射——**三款教学末步：crd='placed'/etm='picked'/cir='lit'**）→ 探针定钩子语义（**必含一次真实点击**）→ 独立复验（verify_batch39.py T1-T11+T9b；**独立表先读实现 data.js 的 id 定版再抄录**）→ 全量回归（verify_final39.py R1-R8；R6 主入口 114→117；**R8 静态关 dch=flat//5+1 映射**）→ 两级入口 → 反方审查+分龄试玩（crd=5 岁半/etm=6 岁半/cir=7 岁半）→ 修复闭环 → 收官（117/120）

**实长表（浏览器 Audio 实测 2026-09-12；等待窗=实长+300 余量；全表 15 条零缺漏 bad=[]，_clipdur39.json 真值源；题表先验脚本验算 _verify_spec39.py 全过 ✓）**：
- **crd_**：tut_watch 2928/tut_turn 1728/hint 2592/**right 2016（判对后窗 ≥2316）**/wrong 1968；确认链=right 单 clip **2316**；**crd 错链=wrong 1968+150+hint 2592+300=5010**；主题句=题面 keyless（「给小兔子做一张生日贺卡」10 字 estMs 4050——句表 §1 实现定）
- **etm_**：tut_watch 3240/tut_turn 1848/hint 2088/**right 1632（判对后窗 ≥1932）**/wrong 2088；确认链=right 单 clip **1932**；**etm 错链=wrong 2088+150+hint 2088+300=4626**；情境句=题面 keyless（10-14 字 estMs 4050-5430——§2 题表句全文）
- **cir_**：tut_watch 2856/tut_turn 1824/hint 1968/**right 1968（判对后窗 ≥2268）**/wrong 1848；确认链=right 单 clip **2268**；**cir 错链=wrong 1848+150+hint 1968+300=4266**；观察句=题面 keyless（8-10 字 estMs 3360-4050——§3 实现定）
- 教学预算验算（三款均单步演示款 ≤16s 名义）：crd ≈3228+主题句 4350+ghost 1120+落位演出 1000+2316≈12000 ✓；etm ≈3540+情境句 4740+ghost 1120+脸谱选中 1000+1932≈12300 ✓；cir ≈3156+观察句 3705+ghost 1120+灯亮电流 1500+2268≈11700 ✓（余量充足——实现后回填实测）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 15 条合成 ok=15 fail=0；gate G3 注入数 5+5+5+core 3。

## §5 反方审查+试玩修复记录（收官回填）

### §5.0 agent 交付偏离裁决（2026-09-12，全部接受——主线逐条核实）

**三款共同（最重要）——题表服务语义=章池+关内 rotate**：实现将 §1-3 的「题表 20 行」落为 **4 章池×5 行，每关取章池按 (flat%5) 旋转取 5 题**（题(flat,k)=表行[(flat//5)*5+((flat%5)+k)%5]，crd ch1 池含重复主题 [b,n,b,n,b] 也照转）——thanks 先例（b37）；章域/题值/内部一致性全对，三款 _dump39 干净通关 dump 20 关×5 题逐位实证。**裁决=接受**：5 题池×5 关全旋转保证同章每关体验互异且零重复感，优于线性平铺；verify 独立表索引已按此口径修正（v1 按关级线性表断言=T3 三款同型 FAIL 的根因——非实现缺陷，verify 侧口径错）。
- crd：①主题句「给小兔子做一张生日贺卡」11 字定版（10 字口径勘误）；②wish 图卡 id 定版 wbd/wny/wth/wsr（零文字图卡）；③步进不重播主题句（卡内 stage 推进只播换盘音）；④成品定格+送出演出 ~2s 定版；⑤**末题卡不送出、不入贺卡集**（末题直接 winFlow——末卡三层已定格画布+celebrate 覆盖；家族惯例末题过关演出优先，b39 审查 m-1 裁决补备，实现不动）
- etm：①§4 字数口径 6-13 字（§2 题表真值源优先，10-14 勘误）
- cir：①教学演示题取实现自定行；②固定槽 part 恒 'M'（中性档不泄答案，偏离=2 档中性）；③**锁窗全面取消 +140 尾窗**（b39 起总窗口径从严——wrong+150 首错即锁全链，无尾窗豁免段）；④hook 无 layout 字段/false 返回值（豁免窗错点吞）；⑤ch4 题行照抄 ch3（差异由 rotate 承载）；⑥槽位触摸目标改非空联合盒断言；⑦reread 钩子入 hookKeys

### §5.1 反方审查修复轮（2026-09-12，REPORT-REVIEW-b39.md：fatal 0/major 2/minor 3）

- **M-1（major，修+实证）**：etm 首错锁断言未按总窗口径——verify ⑨ 只断常量 `BOUNCE_MS <= 2238`、build 第二条基准多 +300（实锁总窗 1100+140=1240 的尾窗 140 无覆盖；三款唯一违例，crd `SHAKE_MS*1+140`/cir 常量+负向禁叠尾窗均合规）。修=verify ⑨ 改 `BOUNCE_MS * 1 + 140 <= D.etm_wrong + 150`（对齐 crd 写法）+build 基准删 +300；防回归判别力实证恢复（BOUNCE_MS 漂到 2100→总窗 2240>2238 两道断言同红）。
- **M-2（major，修+实证）**：etm 全链零真实 DOM 点击证据——探针/smoke/页内 verify/外层复验全走 `ETM.tapPick` 钩子，`picksEl pointerdown`（main:431）绑定链断裂时全绿盲区（crd/cir 有 _selftest 真实点击等效覆盖，etm 无 _selftest.py）。修=补 `etm/_src/_selftest.py`（pg.click('.pick[data-i]') → help 段点击→solo→flat0→autoSolve done→存档 v1.0 stars=3 全链 SELFTEST PASS）。
- **m-1（minor，SPEC 补备）**：crd 末题卡不经 cardFinish 不送出不入集→§5.0 crd ⑤ 补备（实现不动）。
- **m-2（minor，backlog）**：etm/cir `state.quiet` 死状态（只写不读）——下次该款改动时删。
- **m-3（minor，修）**：三探针+verify_batch39 头注释「必含真实点击」失实→改「钩子枚举口径；真实 DOM 点击由各款 _selftest 承担」。
- 修复后链：rebuild etm（323115 chars）+ _selftest PASS + etm 复验 12/12 复绿 + **R1-R8 全量重跑 8/8**。

### §5.2 分龄试玩裁决（2026-09-12，REPORT-PLAYER-b39.md：P1=0/P2×2/P3×5）

- **106 断言全过+pageerror 0/0/0+零代码修复**（同 b30 先例）。分龄终评：crd 4.5（前两章放手/ch3-4 陪读）/etm 4.0（前两章放手/ch3-4 陪读）/cir 4.5（放手独玩）。
- 错反馈不泄答案三款 DOM 实证（首错无 breathe）；错链窗二击吞（5010/4626/4266）；14s 方向级救援三款静置触发；etm 温度计 data-lv 三档升位 1→2→3；cir 闭合回路三题全证+兔槽补齐+环流；家长门+多玩 5 放出+dayEnd/restTip 收口全过。
- **P2-1（etm l1/l2 强度区分副词级线索 subtle）→backlog**：题表先验已验算（三梯度互斥），改句=动题表+破坏先验+语音重录；真实儿童观测后再议（与审查「语义边界=设计裁量」同向）。
- **P2-2（crd 单关 84s 耐心边界）→backlog**：报告自评「可接受，观测到流失再收 1-2s」。
- P3×5（crd 三步卡主题记忆/cir hover 频闪+触屏退化/etm 文字标签冗余/cir 并联首题无过渡/家长门无清空）→观察项不动。
- 测试侧披露四条入坑库：crd 多步连做漏循环（b38 坑③复现）/开题演出窗点击须模拟儿童再点/cir 模型领先 DOM 2.6s 跨题断言先等板重画/帮阶段 ghost 8s 后才现等待窗 ≥12s。

### §5.3 终验（2026-09-12）

- 三款复验 12/12×3（修复后产物终态）+R1-R8 **8/8** 两轮（修复前基线+修复后终态）：R4 clips/R5 家长门 v1.0/R6 主入口 117+3+子页/R7 href 全可达/R8 真实路径三款 dch=[2,2,2,2,3]+ch3 题型族（crd 三步卡/etm level 族/cir 5 槽并联）+写档 2-1..3-0。
- **收官 117/120**。
