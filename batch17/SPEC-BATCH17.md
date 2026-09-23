# SPEC-BATCH17 · 7-8 岁三款（古诗填空 / 铺砖面积 / 镜像迷宫）契约 v1（2026-09-08）

对象：7-8 岁（一二年级：识字量 ~1500、古诗课标启蒙 8-12 首、面积/对称未正式学=启蒙定位）。目录 `batch17/poemfill|area|mirrormaze/`。
结构照 batch1-16：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch16/read/_src/（点选项卡+短文排版+听读先例）、batch16/spellen/_src/（点瓦片入格+退回+提示先例）、batch14/blocks/_src/（SVG 造型+几何精确）。

## §0 共同门禁（§0.1-0.30 全承 batch15 原文，一项不满足=不收；31-33 承 batch16；34-36 本批新增）

1-30 条照 SPEC-BATCH15.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/文字允许/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/晃动防重入/演示实证；§0.28-0.30 币制/唯一解/有解性为 b15 款专属不适用）。31-33 承 b16（read 短文自洽/spellen 英文 clip/idiom 图意——仅适用项）。**b16 增补并入：错点防重入窗 1000ms（b16 试玩 P2-1 定案）；教学演示 watch ≤16s（b16 试玩 P3-1 定案）。**

34. **poemfill 古诗封闭库**（本批新增）：诗库 10 首一年级课标级封闭（game-data.js 定稿：题面/挖空句/挖空字答案/干扰字池）；**挖空字必须诗句内唯一**（同句他处不出现该字——verify 分源断言）；干扰字=常用字池 2-3 个（不与挖空字同、不与答案构成同句另一合法读法）
35. **area 铺砖可解性**（本批新增）：每题候选砖恰 1 块能铺满挖空区（其余两块面积不符或形状不嵌——verify 分源复算：形状格多重集精确匹配，禁用生成器 answer 自证）；砖块/挖空区 SVG 格子几何精确（格线对齐，禁 CSS 像素拼凑误差）
36. **mirrormaze 对称真值**（本批新增）：图案对称轴恒竖直（左右镜像）；镜像关系用坐标翻转公式独立复算（verify 侧自带 mirror(x)=W-1-x 实现对账，禁复用游戏侧函数）；补全题唯一解（给定半图案+对称约束下目标格集唯一）

## §1 poemfill 古诗填空（名句填字；点字卡款，不灰化）

**玩法**：每题=一首古诗卡（标题+四句，其中**挖空句**显示为 □□ 空格）+读音按钮（点=播整首朗读 clip）+字卡池（答案字+2-3 干扰字打乱）。依序点字卡填空格：
- 填满且对：诗句亮+全诗朗读 clip（听整首）+下一题（新诗/新挖空）
- 填满且错：晃动零惩罚；已填字**可点退回**（点格=退回该字）
- 点读音=重听（主动学习重置救援钟）；点「提示」=首空格 breathe（不自动填入）

- 诗库（10 首封闭，一年级课标级，game-data.js 定稿）：
  - ch1 五言·挖 1 字（8 题）：咏鹅（鹅/歌/水）、静夜思（床/月/思）、春晓（春/眠/鸟）、悯农（锄/盘/粒）
  - ch2 五言·挖 2 字（8 题）：登鹳雀楼（白日依山尽/黄河入海流）、池上（小娃撑小艇/偷采白莲回）、寻隐者不遇、江雪
  - ch3 七言·挖 2 字（8 题）：望庐山瀑布（日照香炉生紫烟）、赠汪伦、早发白帝城、绝句（两个黄鹂鸣翠柳）
  - ch4 整句回忆·给上句挖下句首二字（生成：从库内抽句组合）
- 同关 5 题互异（题 sig=诗 id+挖空位置）；干扰字=该诗外常用字池抽取（避开答案字+不与挖空句任何字相同）
- 星级：错次口径（填满判错一次=1 错；退回不计错）
- 救援：整首朗读重播+首空格 breathe+答案字卡 pulse 三连
- 教学：watch=演示读诗→指挖空→点字→对；帮/独；`__pfDemoR`（§0.27）
- 钩子：`PF = { get currentLevel, get quiz(){ poem(标题), lines[4](句，挖空位=□), blankLine(句 idx), blanks[2](挖空字), tiles[](池字), built[](已填或 null), step, miss }, tapTile(i), tapBuilt(i), hear(), autoSolve() }`
- 语音：pf_tut_watch'看！读一读古诗'/pf_tut_turn'你来填一填'/pf_hint'听一听想一想'/pf_right'填对啦，你真棒'/pf_wrong'再读一读这句诗'；**整首朗读=pf_poem_<id> 10 条中文 clip 预合成**（诗全文朗读，晓晓声）；挖空句读音=TTS 兜底（豁免，§0.23 仅题句 clip 化——挖空句动态）；提示句 pf_first'第一个字亮啦'；字反馈=中文 TTS 兜底（豁免）

## §2 area 铺砖面积（格子面积启蒙；点砖块卡款，不灰化）

**玩法**：每题=一块"工地"SVG 网格（5×5 内，含挖空区形状=若干格子拼合的高亮轮廓）+3 张砖块卡（各为小形状：面积或形状不同）。点选**恰好能铺满挖空区**的那块：
- 点对：砖块飞入挖空区逐格点亮（覆盖动画）+下一题
- 点错：晃动零惩罚+错误砖块闪一下红边（面积不对的提示）；可重点
- 「数格子」按钮=点一下数一遍挖空区格数（主动学习重置救援钟，TTS 兜底数字）

- 题型（4 章，game-data.js GEN 确定性生成）：
  - ch1 数格子：问"挖空区有几格"→点数字卡 3 张（1-10 计数）
  - ch2 比大小：两个形状谁大→点大的形状卡（2 选 1，格数不同）
  - ch3 选砖：3 选 1 恰好铺满（形状=1×1/1×2/1×3/2×2/L3/T4/Z4 旋转不变形状池）
  - ch4 组合铺：挖空区面积=两块砖之和→点正确的两块组合（3 选 2，只有一组恰好铺满）
- 生成约束：ch3 挖空区=砖形状本体（面积 1-4 格）；ch4 挖空区=两砖不重叠拼接（面积 4-8 格）；干扰砖面积≠所需（格多重集不匹配——§0.35 分源）
- 星级：错次口径；救援=数格子重数+正确砖卡 breathe
- 教学：watch=演示看挖空→数格子→点对砖；帮/独；`__arDemoR`
- 钩子：`AR = { get currentLevel, get quiz(){ kind, hole[](格坐标 [x,y] 数组), cards[3](各 {cells,kind} 或数字), answer, step, miss }, tapCard(i), countCells(), autoSolve() }`
- 语音：ar_tut_watch'看！数一数格子'/ar_tut_turn'你来铺一铺'/ar_hint'数一数格子想一想'/ar_right'铺好啦，真整齐'/ar_wrong'再数一数格子'；数数句=ar_count_1..10 clip（10 条）；提示句 ar_tip'数数格子再选砖'

## §3 mirrormaze 镜像迷宫（对称补全；点格子款，不灰化）

**玩法**：每题=网格（ch1-2 为 4×4，ch3-4 为 5×4）+左侧半图案（若干格涂色小动物脚印/花色）+右侧空（对称位）。**点右侧空格**补全镜像：
- 点对（=某左侧色格的镜像位）：该格点亮成同色（正确与否即时可见——低挫败设计：点非镜像位=格子闪一下不点亮，可重点；**注意零惩罚口径：闪≠miss**）
- 全部镜像位补齐：对称轴闪+图案完整 celebrate+下一题
- 每题限量=镜像位格数+0（必须全对才推进——但错点不计 miss 只计次数？**星级口径：错点次数照常计 miss**（点非镜像位=1 错），零惩罚=可无限重点）

- 题型（4 章，GEN 确定性生成）：
  - ch1 4×4 补 2-3 格（图案简单：横排/竖排色块）
  - ch2 4×4 补 3-4 格（图案=L/Z/T 形）
  - ch3 5×4 双色图案补 4-5 格（两色各若干格，镜像含颜色对应）
  - ch4 5×4 补 5-6 格+干扰（图案含靠轴格——镜像位=自身，增加判断）
- 对称轴恒竖直居中；**靠轴列的格镜像=自身**（已给色则无需补——ch4 用此特性出判断题感）
- 星级：错次口径；救援=一个未补镜像位 breathe+对应左格 pulse
- 教学：watch=演示看左→指右镜像位→点；帮/独；`__mmDemoR`
- 钩子：`MM = { get currentLevel, get quiz(){ W, H, left[](左半色格 [{x,y,c}]), targets[](应补格 [{x,y,c}]), step(已补进度), miss }, tapCell(x, y), autoSolve() }`
- 语音：mm_tut_watch'看！照镜子拼一拼'/mm_tut_turn'你来拼一拼'/mm_hint'看看左边想一想'/mm_right'拼好啦，真对称'/mm_wrong'照照左边再看看'；无额外词 clip（题面无文字）

## §4 交付与验收（承 batch15/16 流水线）

- 语音预合成（主会话 gen_clips.py 扩 pf_ 中文 5+10 诗朗读、ar_ 中文 5+10 数字、mm_ 中文 5——约 35 条）→ 3 agent 并行 → 首单元门禁 → 独立复验（**断言从本 SPEC 推导，禁从实现行为归纳——b15/b16 双批教训；多重集/anagram 类比较两侧同归一（sorted 签名）——b16 S4 假绿实锤**）→ 全量回归 → 两级入口 → 反方审查+7.5 岁试玩 → 修复闭环 → 收官

## §5 poemfill r13 难度改造版本块（2026-09-15 定版——§1 v1 原文作废留档，本块为真值源）

**改造背景（审计红款 AUDIT-78 poemfill 行）**：挖 1-2 字+全诗朗读+干扰 2-3=重度脚手架再认（整首朗读挂在题面=听写级提示；单字再认 Bloom 底层）。r13 六 delta（AUDIT-78:68 定死）+时长模型 modeled 单关 ≥40s。玩法框架保留（点卡入槽/退回零惩罚/确定性 seeded/星级 miss 口径/救援 14s/教学看帮独/家族契约全承；b17 填空引擎 engTapTile/engTapBuilt/rescueTarget/engStars 按"字符串卡+槽位"通用原样沿用——tiles 从单字升整句零改动；build 4 script 块布局承 b36 M1）。

### r13 玩法真值（delta 六条）

- **delta① 挖空升整句回忆（再认→回忆）**：题型四型——F 给上句选下句（cueIdx 0-2，ansIdx=cueIdx+1）/R 给下句选上句（cueIdx 1-3，ansIdx=cueIdx-1，逆向联想）/O 句序重组（给首句，排 li1-3 三槽）/FF 飞花令（指定字跨诗检索，见 delta④）。章题构成（COMPOSE 定版）：ch1 五言 F×3+R×2（3 卡）/ch2 七言同构（4 卡）/ch3 F×3+R+O（4 卡 3 槽）/ch4 FF×5（4 卡）。生成关 flat≥20 dch=mulberry32(flat*7919+13) 首随机数 ri(1,4)，诗池按档轮换（dch1 五言 18/dch2 七言 12/dch3/FF 全库 30）。
- **delta② 去整首朗读脚手架**：整首朗读 pf_poem_* 退出题面（开场链/重听/救援均不再播）；开场链=queue([pf_hint]) 单通道；「重听」语义=读题面上句（TTS 豁免——可见文本朗读不泄答案）；整首 clip 唯一保留用途=关末奖励（winFlow 播，ch4 无单一诗不播）。首字提示=「提示」按钮亮目标句首字（pf_first 通道，题面不预置——防首字匹配捷径击穿决策时长）；救援 14s=pf_first+首字亮出+槽 breathe+答案句卡 pulse 三连。
- **delta③ 诗库 10→30 首二年级课标**（既有 10 首文本一字不改仅补 author；新 20 首出处逐首登记下方诗目表；120 句全互异——verify/独立复验双侧断言）。
- **delta④ 飞花令主题关（ch4 型）**：指定字轮换 FF_CHARS=['飞','春','花']（char=FF_CHARS[(lv+k)%3]，三字每关全覆盖）；正解句=库内含字句（关级去重，答案句互异）；干扰=库内**不含**指定字句 3 张互异（优先同长）。出题域频次：飞 6/春 7/花 8 句 ≥5。
- **delta⑤ 时长门禁 modeled ≥40000ms**（crd r12 范式，见下方时长模型）。
- **delta⑥ 干扰句规则**：F/R=同诗他句恰 1（≠题面句≠答案句）+其余他诗**同全字符长度**句互异（ch1 3 卡=干扰 2、ch2/ch3 4 卡=干扰 3）；O=他诗同长 1；FF 见 delta④；句卡互异、干扰≠答案≠题面句（verify/verify_one 分源复算禁同句重复）。反启发式锚：同句跨题正解+干扰双现 ≥5 句（实测 65）。
- 关→诗映射（静态 20 关一诗一课）：ch1 jys,cx,mn,glyx,hua / ch2 wlsbp,zwl,jgsh,xich,cunj / ch3 yie,dgjl,cs,jx,cao / ch4 无单一关诗；星级=错次口径（0 错 3★/1-2 错 2★/更多 1★）。

### r13 新增 20 首诗目出处表（部编/人教一二年级课标；逐字校对）

| pid | 诗名 | 作者 | 出处 |
|---|---|---|---|
| hua | 画 | 佚名 | 部编一上「识字」 |
| glyx | 古朗月行（节选） | 李白 | 部编一上 |
| feng | 风 | 李峤 | 部编一上 |
| xyze | 寻隐者不遇 | 贾岛 | 部编一下 |
| xich | 小池 | 杨万里 | 部编一下 |
| huaj | 画鸡 | 唐寅 | 部编一下 |
| yess | 夜宿山寺 | 李白 | 部编二上 |
| meih | 梅花 | 王安石 | 部编二上 |
| xec | 小儿垂钓 | 胡令能 | 部编二上 |
| cunj | 村居 | 高鼎 | 部编二下 |
| yl | 咏柳 | 贺知章 | 部编二下 |
| cao | 草（节选） | 白居易 | 部编二下 |
| xjc | 晓出净慈寺送林子方 | 杨万里 | 部编二下 |
| mnq | 悯农·其一 | 李绅 | 部编二下 |
| zys | 舟夜书所见 | 查慎行 | 部编二下 |
| sjian | 所见 | 袁枚 | 人教一下 |
| zlj | 赠刘景文 | 苏轼 | 人教二上 |
| shx | 山行 | 杜牧 | 人教二上 |
| sxg | 宿新市徐公店 | 杨万里 | 人教二下 |
| jj2 | 绝句·迟日 | 杜甫 | 部编三下（二年级可读补充） |

（古朗月行取教材节选四句「小时不识月…飞在青云端」；草取「离离原上草…春风吹又生」节选；咏鹅首行「鹅，鹅，鹅」含顿逗全字符口径 5。既有 10 首沿用 b17 定稿：咏鹅/静夜思/春晓/悯农/登鹳雀楼/池上/江雪/望庐山瀑布/赠汪伦/绝句。）

### r13 钩子契约（PF）

`{ get currentLevel{flat,ch,dch,lv,pid,n,step,retries,done,won,locked}, get quiz{ type('F'|'R'|'O'|'FF'), poem(题名), author, pid, lines（题面视图：题面句全文/答案句□串/不参与句''；FF=null）, cueIdx, targetChar, ask（FF 题面问句）, slots（答案句序）, cards（句卡池）, built, step(关级), miss }, tapCard(i), tapBuilt(i), hear(), hint(), start(flat), autoSolve(), modeled(flat), get tutorial, get rescues }`。tapCard 返回：单槽对 'right'/末题 'done'/单槽错 'wrong'（入槽即判）/O 型未满 'placed'/非法或演出期 false。

### r13 时序与时长模型（真实页名义值；verify SPEED=0.12 提速）

- 每步 dur=max(voiceWin, DECIDE_MS[type])+每题 ADV 一次：voiceWin 首步=ENTER 400+estMs(题面句)+300、后续步=STAGE 400；ADV=RIGHT_WAIT 2000+estMs(答案句)+LINE_TAIL 400（选对=right clip 主体+答案句完整朗读 say 原句巩固——b17 试玩 P2-2 紧凑路径）。
- estMs=s.length*345+600（b25 定版 SAPI ~345ms/字+600 全字符口径——四方同步：源常量+注释+verify estMsV+build.py 字面 assert）。
- DECIDE_MS={fnext:9000,fprev:10000,order:11000,feihua:12000}（7-8 岁认知推算：给上句忆下句=线索读入+整句检索+候选扫读比对+确认；逆向+1000；句序重组工作记忆 11000/步；跨诗检索无上下文锚 12000）。**语音窗从不撑时长**（最长句 7 字 voiceWin 3715<9000；FF 题面句 11 字 4395<12000）。KIND_OF={F:fnext,R:fprev,O:order,FF:feihua}。
- 验算：ch1 关=（9000+4725)×3+(10000+4725)×2=70625；ch2=74075；ch3=93625；ch4≥83625——**40 关 modeled 最低=70625@flat0**（LEVEL_MIN_MS=40000 硬断言，verify ⑭+verify_one P9 独立副本复算）。

### r13 语音（manifest games=['poemfill'] 39=core 3+pf_ 6+pf_poem_ 30）

pf_ 六键文案一字不改沿用 b17（tut_watch/tut_turn/hint/right/wrong/first）；pf_poem_ 扩至 30 条（诗名。+全文朗读，晓晓声）——clip 通道禁 TTS 兜底（缺 clip=静默 false）。FF 提示=pf_hint+say(指定字)（发音辅助不泄答案）；FF 对选揭示出处（《诗名》·作者）。

### r13 verify（10 单元 49 记）+独立复验+selftest

① 40 关全量审计（确定性/30 首分源对账/关诗映射/章题构成/题型结构/干扰句规则分源/飞花令含字域与轮换/章诗长档/pf_poem_ 30 在场/sig 互异/structOk/反启发式锚 ≥5）+①b 引擎直驱（非法拒/填满错恰一次/退回零计数/星级三档）+①c 救援目标闭环 ② tapCard 单元（flat0 F+flat10 O：入槽 DOM/退回复活/钩子视图）②b sayW 三态 ③④④b 冒烟（flat0 错一次 2 星+关末整首奖励；flat10 O 通关；flat15 飞花令正解含字干扰不含+无整首奖励）⑤ 布局双 viewport×四形态（竖屏三件套 M3；.scard 高横 76/竖 66 判别锚；FF 形态读音主目标分流 btn-hear≥72）⑥ 分布专项（文案/诗库/映射/FF_CHARS 双写+飞 6 春 7 花 8/39 clips/开场链单通道/重听=题面句/首字提示/整首无 TTS 兜底/跟读）⑦ 教学链（demo '__pfDemoR'='right'+不 say 答案句+交接单通道）⑭ duration（独立副本 40 关对账+最低 70625 精确+源常量同步）。verify_one（Python 独立：30 首诗库第二写+40 关结构时长复算+P5-P9 行为语音+P8 真实页救援 14s）。_selftest（P1 横+P1b 真竖 800×1180 scardH=66+P2 真实页教学链→turn 点对→autoSolve 3 星→存档 kidsgame_poemfill→clips 39）。

## §6 mirrormaze r14 难度改造版本块（2026-09-15 定版——§3 v1 原文作废留档，本块为真值源）

**改造背景（AUDIT-78 mirrormaze 行：🔴 估 20-40s，试玩自评 2/5，补镜像格=纯知觉）**。r14 四 delta+锚+时长门禁（AUDIT-78:70 定死）。玩法框架保留（点格补全/零惩罚可重点/确定性 seeded/星级 miss 口径/救援 14s/教学看帮独/家族契约全承）；对称语义从「恒竖直轴」升「轴向族」——六 kind 轴向真值如下（写前已 Python 独立复刻逐轴验算 30 记全过）。

### r14 镜射变换群真值（数学先验；verify 三源分算：引擎/verify JS/Python verify_one）

格坐标 (x,y)=（列,行），0 基；盘 W×H。反射记 R_K(x)=K-x（K=W-1 中心轴）：

| kind | 轴 | 变换 T(x,y) | 复合/性质（验算锚） |
|---|---|---|---|
| v | 竖直居中 | (W-1-x, y) | K=W-1 界内双射；4×4/6×6 均成立 |
| h | 水平居中 | (x, H-1-y) | 与 v 同构转置；L=H-1 双射 |
| d1 | 主对角线 x=y（方盘 5×5） | (y, x) | 对合；轴上不动点 x=y 恰 5 格（不产 target）；源侧 y>x 10 格 ↔ 目标侧 x>y 10 格互斥 |
| d2 | 反对角线 x+y=4（方盘 5×5） | (4-y, 4-x) | 对合；不动点 x+y=4 恰 5 格；源侧 x+y<4 ↔ 目标侧 x+y>4 各 10 格 |
| vv | 两平行竖直轴 K1,K2 | 先照 K1 再照 K2：x→K2-(K1-x)=**x+(K2-K1)**（平移） | 全域恒等式 R_K2∘R_K1=x+(K2-K1)；配置 (K1,K2)∈{(3,5):Δ+2,(1,5):Δ+4,(5,3):Δ-2,(5,1):Δ-4}，源带=移出侧 2 列（Δ>0→cols0-1，Δ<0→cols4-5），目标带=源带+Δ 界内且与源带不交 |
| r180 | 竖直 K=5+水平 L=5 双轴 | (5-x, 5-y)＝绕盘心**旋转 180°** | 分量独立⇒交换律；源带 cols0-2→目标带 cols3-5 不交 |

- **双镜复合数学真值（delta③核心）**：两平行轴镜射复合=平移（方向由照射次序定：先 K1 后 K2 移 K2-K1）；两垂直轴复合=180° 旋转（次序无关）。儿童可发现「照两次=平移/转半圈」——数学结构本身成为玩法。
- **周期混合（delta④核心）**：6×6（K=5 奇）棋盘格周期图案（色=(x+y)%2）镜像后**全格反相**，周期续延/直接照抄（同相位）预测与镜像真值逐格全异 ⇒ 局部匹配策略必错，判别为真（5×5 K=4 偶则同相不可用——6×6 选型数学必要）。**公平性不变式（写前定死）**：镜像补全款中 given 格必镜像自洽（其变换位=target 同色，或自映轴上格）——禁设「周期陷阱 given 格」（其变换位为空=盘面不对称，理性儿童照镜规则点击反遭 miss=不公平）；周期干扰由棋盘格反相本身承载（照抄策略全错），图案边界外的空格续延诱惑由镜像真值（空=空）天然拦截。

### r14 玩法与章结构（CH_LEN=5、STATIC_LEVELS=20、种子族 mulberry32(flat*7919+29) 承旧）

- ch1（dch1）4×4，v/h 轴逐题轮换（seeded），源侧固定（v=左半 2 列/h=上半 2 行），L/Z/T 形补 3-4 格——轴向读取入门（心象旋转 90°）。
- ch2（dch2）5×5 方盘，d1/d2 逐题轮换，源侧=轴一侧三角 4-5 格+轴上干扰格 1-2 格（不动点，已给色不产 target）。
- ch3（dch3）6×6，pv/ph（v/h 轴）+**双向**（源侧 seeded 左/右或上/下——判哪侧是源）+棋盘格周期图案（pv=2 列×3 行块/ph=3 列×2 行块，色=(x+y)%2 两色指派）补 6 格——镜像色全格反相，照抄/续延策略必错。
- ch4（dch4）6×6，vv（平行双镜=平移 ±2/±4，源带 2 列）/r180（180° 旋转，源带 cols0-2）补 4-6 格，双色随源。
- 生成关 flat≥20 dch=ri(rnd,1,4)（§0.3 承旧）；同关 5 题 sig 互异（sig=W×H+kind+源全格+轴参数）。
- **反启发式锚（delta⑤）**：同模板跨题**正解互异**——同模板在不同 kind/轴向参数/源侧配置下出现且其答案变换互异（记答案变换签名=kind+轴参数+源侧；同签名答案唯一确定，跨签名答案不同），40 关内「≥2 个互异答案签名」的模板 ≥5 个（verify 实测断言+实测值写注释）——记住图案不等于记住答案，必须读轴。
- 唯一解：T 双射+源带/目标带不交 ⇒ 给定源格集+轴下目标格集唯一（§0.36 承）；targets[i] 增 sx,sy（镜像源格坐标，救援对/教学用）。
- 教学链承旧（flat0 看-帮-独）；flat0 q0 固定 v 轴（「看左」演示兼容）。

### r14 钩子契约（MM）

`{ get currentLevel{flat,ch,dch,lv,n,step,retries,done,won,locked}, get quiz{ W,H,axis{kind,a?,b?}(vv 带 K1=a,K2=b), given[](源侧色格[{x,y,c,role}]，role='src'|'axis'), targets[](应补格[{x,y,c,sx,sy}]), step(已补进度), miss }, tapCell(x,y), start(flat), autoSolve(), modeled(flat), get tutorial, get rescues }`。tapCell 返回承旧（'placed'/'right'/'done'/'wrong'/false-null 钩子层）；given=源格（src，必产 target）+轴上干扰格（axis，自映不产 target，dch2 专属）。

### r14 时长模型（crd r12 范式；真实页名义值；verify ⑪ 独立副本复算）

- 每步（=每 target 一次定位点击）dur=max(voiceWin, DECIDE_MS[kind])+ADV_STEP 600；每题 +ADV_QUIZ 3015（=estMs('拼好啦，真对称')=7×345+600，7 字符全字符口径含逗号，right clip 主体窗）；voiceWin 首步=ENTER 400、后续=STAGE 400（本款无题面句——**语音窗从不撑时长**恒 ≤400<4000）。
- estMs=s.length*345+600（b25 定版，四方同步：源常量+注释+verify estMsV+build.py 字面 assert）。
- DECIDE_MS（7-8 岁单格镜像定位认知推算）：**v 4000**（竖直轴=已巩固镜像锚：轴读入+同行距离翻转+确认，原款基线）/ **h 5500**（水平轴=心象旋转 90°，儿童心理旋转 RT 随角差近似线性 +40%）/ **d1/d2 7500**（45° 斜轴=最大角差心象旋转，斜向参照系未建立须逐格行列互换）/ **pv/ph 8000**（周期+双向：源侧完整性判别 1500+逐格抗周期续延查轴）/ **r180 9500**（双垂直镜复合=180° 旋转：对角定位+两镜心象叠加）/ **vv 10000**（双平行镜复合=平移：方向判别+两镜叠加，双轴参数工作记忆最重）。
- 验算（targets 下限）：ch1=5×(3×4600+3015)=84075 / ch2=5×(4×8100+3015)=177075 / ch3=5×(6×8600+3015)=273075 / ch4=5×(4×10100+3015)=217075（ch4 含 r180 10100+vv 10600，下限取 r180 全 4 格关；r14 审查 m-8 勘正：原写 227075 系按 vv 10600 非保守口径）——理论下限 84075（全 3 格 v 模板关）；**40 关 modeled 实测最低=93275（flat0 全 v 关 17 格：3+3+4+4+4 模板）**（LEVEL_MIN_MS=40000 硬断言，verify ⑪+verify_one 独立副本复算+实测精确值 93275 防回漂）。

### r14 语音（manifest games=['mirrormaze'] 10=core 3+mm_ 7）

既有 mm_ 5 键一字不改（tut_watch/tut_turn/hint/right/wrong）；r14 新 2 键（轴向语义修正——非 v 轴题不再说「左边」）：**mm_hint2**'看看镜子那一边'、**mm_wrong2**'照照镜子再看看'（v 轴沿用旧键）。tip 文案按轴切换（非 clip）。

### r14 verify（单元全列）+独立复验+selftest

① 40 关全量审计（确定性/静态章映射/sig 互异/六 kind 结构分源复算——verify 自带 T 独立实现禁引引擎/棋盘格反相判别=pv·ph 每关存在位置相位互反：target 色=源格同色，且该位置周期续延预测色 assign[(x+y)%2] 与同色复制真值 assign[(sx+sy)%2] 恒互反（K=5 奇）——照抄/续延策略逐格全错（r14 审查 m-2 勘正：原「每 target 色与源格色互反」措辞误写，色恒同源、互反在相位）/公平性不变式=every given(src) 的变换位=target 同色、axis 格自映/反启发式锚（≥2 互异答案签名的模板 ≥5，r14 实测=6——verify_one M4 同口径 2026-09-15）/pv·ph 双向覆盖率/vv 平移量与轴参数对账/structOk）+①b 引擎直驱（非法拒/错点 miss 恰一次/点 given 格=wrong/逐 target 推进/星级三档）+①c 救援闭环（rescueTarget 步进收敛）② tapCell 单元（错点闪不点亮/点对同色/重点拒/越界 false）②b sayW 三态 ③④ 冒烟（flat0 错一次 2 星+轴 flash；flat15 ch4 全对 3 星）⑤ 布局双 viewport×四 dch（格子 ≥64 含 6×6 档/portStyle 竖屏锚/overflowX≤0）⑥ 分布专项（文案双写/10 clips/开场链/提示通道轴向分流）⑦ 教学链（__mmDemoR='right'/交接单通道/watch≤16s）⑪ duration（独立副本常量 40 关对账+每步 DECIDE≥voiceWin+实测最低 93275 精确（flat0）+源常量同步）。verify_one（Python 第三源独立复算六 kind+周期+双镜+锚+行为）。_selftest（P1 横+P1b 真竖 800×1180+P2 真实页教学链→autoSolve→存档 kidsgame_mirrormaze→clips 10）。stress 连点竞态承旧同步（S1/S2 含 ch3 陷阱格/双镜 kind）。

## §7 area r14 难度改造版本块（2026-09-15 定版——§2 v1 原文作废留档，本块为真值源）

**改造背景（AUDIT-78 area 行：ch1 数格子/ch2 二选一=学前级、全程无真面积计算——数数/比大小再认，7-8 岁二年级已具备表内乘法）**。r14 四 delta+反启发式锚+时长门禁（AUDIT-78:34 定死）。玩法框架保留（点卡作答/零惩罚可重点/确定性 seeded/星级 miss 口径/救援 14s/教学看帮独/家族契约全承）；旧 ch1 数格子/ch2 比大小/ch3 选砖/ch4 组合铺全部退役（count 仅存 dch2-4 首题热身，b17 生成器原样保留）。

### r14 玩法真值（delta 四条）

- **delta① ch1 calc 算一算（真面积计算）**：矩形挖空区+长宽标注（SVG text.dim-long「长 N」/dim-wide「宽 N」=题面数据非答案）→ 面积=长×宽/周长=2×(长+宽) 真算，数字卡 3 选 1。COMPOSE=[area×3,perim×2]（确定性爬升）；qi0-2 长宽 ∈2..4（积 ≤16 教学窗），qi3-4 放开 5（积 ≤20，排除 5×5）。干扰：d1=典型错恒在场（area 问混 周长 P 或半周 L+W；perim 问混 面积 A 或半周——长宽对调积与真值恒等不可作干扰，代换半周），d2=近误 ±1/±2。挖空格数=积（bbox+连通+等数⇒完整矩形，verify 分源断言）。
- **delta② ch2 samearea 一样大（同面积异形状判别）**：挖空区=形状池 kind X（3/4 格），3 砖卡选与挖空区**同面积**者——正解=同面积**异形状** kind Y（canonical≠X，防轮廓匹配捷径，必须数格）；干扰=面积 ±1 近误（G=3：2 格 b2+4 格其一；G=4：b3+l3 双 -1 侧）。
- **delta③ ch3 combo 拼砖组（部分和）**：N=3-4 块互异 kind 砖横排展示（无挖空区——防"数整体"绕过加法），问拼合总面积=多砖之和（6..12 格）数字卡；干扰 d1=部分和（漏加一块典型错）恒在场+d2=近误 ±1/±2。
- **delta④ ch4 unit2 一格代二（比例换算）**：挖空区 G 格（2..8，单砖或双砖拼接），一格住 2 只小蚂蚁 → 真值=2G；干扰恒含 G（忘换算典型错，非答案）+2G±2。
- dch2/3/4 首题=count 数格子热身（家族惯例）；生成关 flat≥20 dch=mulberry32 首随机 ri(1,4)（§0.3 承旧）；同关 5 题 sig 互异（sig=kind+子型+挖空区签名+砖组+卡组+answer）。
- **反启发式锚（delta⑤）**：同数值跨题正解+干扰双现 ≥5（值 v 在题 A 为正解且在题 B≠A 为干扰——防"记住某数=对"），verify ⑧ 计数+verify_one A9 独立计数（实测 n=15）。
- 点对演出=挖空区逐格点亮铺满绿（r14 答案与挖空区不再同构，飞入动画退役；combo 无挖空区短窗即收）；确认句=真值巩固朗读（calc perim'一圈 P 格'/combo'一共 T 格'/unit2'一共 2G 只'/其余'G 格'+ar_right）。

### r14 钩子契约（AR）

`{ get currentLevel{flat,ch,dch,lv,n,step,retries,done,won,locked}, get quiz{ kind('count'|'calc'|'samearea'|'combo'|'unit2'), hole[](格坐标，combo=null), GW, GH, cards[3](数字或 {cells,kind}), answer, step, miss, solved }, tapCard(i), countCells(), start(flat), modeled(flat), autoSolve(), get tutorial, get rescues }`。tapCard 返回：'right'/末题 'done'/错 'wrong'（零惩罚可重点）/非法或演出期 false（engTap 去 pair——全题型单答案点卡）。

### r14 时长模型（crd r12 范式；真实页名义值；verify ⑭ 独立副本复算）

- 每题单步：quizDur = max(voiceWin, DECIDE_MS[kind]) + ADV（一次）。voiceWin 首步 = ENTER 400 + estMs(题面句) + 300；ADV = RIGHT_WAIT 2000 + estMs(确认句) + LINE_TAIL 400。
- estMs = s => s.length * 345 + 600（b25 定版，四方同步：源常量+data 注释+verify estMsV+build.py 字面 assert）。
- DECIDE_MS={count:8000, calcarea:11000, calcperim:11500, samearea:9000, combo:10500, unit2:11000}（7-8 岁认知推算：表内乘法口诀检索+辨面辨周复核；周长两步合成 +1000；samearea 点数比对；combo 连加工作记忆；unit2 翻倍换算+G 陷阱辨析）。语音窗从不撑时长（最长 unit2 题面 17 字 7165 < 11000）。
- 验算：ch1 关 ≥3×17795+2×19330=92045（实测 92735-93425）/ch2 关=14795+4×15795=**77975 恒值**/ch3=88115 起/ch4≥90115——**40 关 modeled 最低=77975（dch2 关，AR_DMIN_MIN===77975 精确断言防回漂）**，恒 ≥LEVEL_MIN_MS 40000（r14 门禁）。

### r14 语音（manifest games=['area'] 19=core 3+ar_ 16）

ar_ 16 条一字不改零新增（tut_watch/tut_turn/hint/right/wrong/tip 六键+ar_count_1..10 数数句）；题面问句无专用 clip → 整句 TTS 兜底（§0.23 豁免口径不变）；确认句走 cKey(G)+ar_right 两段 queue（G≤10 clip 化）或整句 say（perim/combo/unit2/两位数 G）。

### r14 verify（53 记）+独立复验+selftest

① 40 关全量审计（确定性/静态章映射/章型构成含 calc 子型 COMPOSE/五型 refRangeOk 分源复算——verify 自带 refNorm/refRot/refCanon 禁引引擎/sig 互异/structOk/反启发式锚计数 ≥5）+①b 引擎直驱（非法拒/错卡 miss 恰一次/正确卡推进/星级三档）② UI 单元 flat0 calc 首题（工地+长宽标注对账+数字卡+推进）②a 几何审计（工地 CELL/砖卡 BCELL/组合砖 CCELL 整数坐标+data 对账+DOM 序对账）②b sayW 三态 ③ 冒烟 A flat0（错一次 2 星+不灰化+不弹层）④ 冒烟 B1/B2/B3（flat5 samearea 3 砖卡+工地+逐格点亮定格；flat10 combo 砖排场景+无挖空格+数格子钮 hidden；flat15 unit2 G 陷阱在场+通关全 filled）⑥ countCells（ar_count 序列）⑦ 教学链（__arDemoR='right'/交接单通道/watch≤16s）⑤ 布局 simView 双 viewport×四形态（body.port 类通道 M3+卡 rect 落容器+portStyle 锚=.ask 字号横 26/竖 22+overflowX≤0）⑧ 分布专项（六键/ASK 四型+calcAsk 两句式/16+3 clips/开场链单通道/读题 TTS 兜底/answer 三位置首位 <60%）⑭ duration（独立副本 estMsV/DECIDE_MSV/advSayV 逐关对账+≥40000+77975 精确）。verify_one（Python 独立：mulberry32+生成器全流程复刻 40 关逐关 JSON 对账+面积/周长独立函数复算+结构分源+锚独立计数 n=15+时长对账 77975+行为/语音+真实页救援 14s）。_selftest（P1 横+P1b 真竖 800×1180 锚 .ask 22px+P2 真实页教学链→turn 点对→autoSolve 3 星→存档 kidsgame_area→clips 19）。
