# SPEC-BATCH27 · 6-7 岁三款（测量小尺 / 硬币认钱 / 音阶小鸟）契约 v1（2026-09-10）

对象：6-7 岁（幼小衔接段：非标准单位测量、人民币认知、音高听辨）。目录 `batch27/ruler|coin|notebird/`。
结构照 batch1-26：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch26/sign/_src/（4 候选卡+封闭集+错反馈链豁免窗 wrongChainUntil——b26 定版新范式，三款主参照）、batch26/calendar/_src/（序数方向句分区+独立硬编码 verify 表）、batch25/habitat/_src/（TTS 窗 SAPI 实测+build 静态断言）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-63 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b26 定版，一项违反=审查 Major 起步）：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)` 与启动等价）；B. 救援钟双锚：14s 方向级独立节流锚（不得重置 lastAct；答案级自身节流独立锚 ≥20s 禁共享）；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]，生成关 GEN_HINTS[k]↔dch=k+1——**nextHint 生成关分支必须实算 `genLevel(f+1).dch-1`，禁 (ci+1)%4 章序推进（b26 审查 M3：calendar 4/4 章末全错）**，verify 必带 C7 型行为断言）；G. queue 拼播链后的等待窗=链总实长+300 余量；教学/演示收束 TTS 不得与链撞头；H. 判对/奖励 clip 后等待窗按实测 clip 时长+300ms 余量；TTS 拼句窗=estMs（~345ms/字）动态或按 SAPI 实测取值并写 build.py 静态断言「窗≥estMs」；**I. 错反馈链豁免窗 wrongChainUntil（b26 定版）：错反馈链起播时设 `wrongChainUntil = Date.now() + 链实长+300`（链=错 clip+150+引导 TTS estMs），救援 interval 顶部早退守卫 `if (Date.now() < wrongChainUntil) return;`（只挡救援读题，不挡主动点选），`startLevel` 换关时重置 `lastWrongVoice = 0; wrongChainUntil = 0;`，build.py 写静态断言「豁免窗≥链实长+300」；**J. 错反馈语义句全程保留（flat≥3 只做 10s 节流，禁切换通用 wrong clip——b26 审查 M2：语义表沦为 flat0-2 装饰）；节流锚 lastWrongVoice 在 startLevel 重置（b26 坑⑦）**〕**

64. **ruler 测量小尺真值**（本批新增）：**物品封闭 6**（pencil铅笔/crayon蜡笔/eraser橡皮/scissors剪刀/toycar玩具车/book故事书）+**单位封闭 3**（clip回形针=基准1/stick小棒=基准2/block积木块=基准3，基准=回形针长度）；物品基准长封闭：pencil4/crayon3/eraser2/scissors4/toycar5/book6（**数学先验自检（b24 坑③）：合法测量组合=整除组合，封闭 12：clip×6（值 4/3/2/4/5/6）+stick×4（book3/pencil2/scissors2/eraser1）+block×2（book2/crayon1），表外组合禁出题**）；题型两族——**数单位**（count：物品下方摆单位链，「铅笔有几根回形针长？」候选=4 数字卡）与**比较**（cmp：「谁更长？」候选=2 物品卡各带其测量图）；**单位陷阱对封闭（ch3 难点，真值按基准长）**：同数异真值（stick-book3=6 vs clip-crayon3=3→book 长；stick-pencil2=4 vs clip-eraser2=2→pencil 长）+数字反直觉（block-crayon1=3 vs clip-eraser2=2→数字 1 的蜡笔长；block-book2=6 vs clip-pencil4=4→数字 2 的书长）——**ch3 出题必含数字与长度脱钩对，干扰禁全是同单位（否则不构成辨析）**；选对=单位链逐根点亮动画+确认句 TTS（「铅笔有四根回形针长」——数字入 TTS 拼句豁免 clip）；选错=语义反馈（count 数错→「再一根一根数一数，是 X 根哦」按所点数字给大小方向：所点>真值「没有那么多，再数数」/所点<真值「还有一小段，再多数一根」；cmp 单位陷阱错→「小棒长，根数少也可能长哦」按所点物品真值引导）；章：ch1 回形针数一数（clip×6 组合）/ch2 换个单位量（stick/block 6 组合）/ch3 单位陷阱比较（陷阱对必出）/ch4 生成混合（flat≥20 随机章型——复验断言用钩子 dch 直读）；每关 5 题；确定性 seeded；星级=错选次数（0=3★/1-2=2★/≥3=1★）

65. **coin 硬币认钱真值**（本批新增）：**钱币封闭 7**：硬币 3（jiao1 一角=银白+兰花+数字1·三硬币最小/jiao5 五角=金色+荷花+数字5·中等/yuan1 一元硬币=银白+菊花+数字1·最大）+纸币 4（yuan1p 一元纸币=绿色+数字1/yuan5 五元=紫色+数字5/yuan10 十元=蓝黑色+数字10/yuan20 二十元=棕色+数字20）；**教学锚=数字+颜色+大小三线索**（SVG 必须三线索齐全：面上大字面额数字+主色+硬币花卉/纸币花纹，硬币大小 1元>5角>1角）；题型三族——**认面额**（coin/bill：「这是多少钱？」候选=4 面额文字卡「1角/5角/1元/5元…」）、**同值辨析**（sameval：「哪个和它一样多？」1 元硬币↔1 元纸币互为答案，干扰必含近对）、**组合**（combo：「一共多少钱？」两枚硬币并排展示，组合封闭 3：yuan1+jiao5=1元5角/jiao5+jiao5=1元（**角元进率教学点，确认句「两个五角，就是一元」**）/yuan1+yuan1=2元，候选=3 组合文字卡）；**近对封闭**：jiao1↔yuan1（同为银白+数字1，区分=大小+菊花兰花）/jiao1↔yuan1p（数字同 1，单位角vs元）；ch3 sameval/combo 出题近对必在干扰（verify 断言）；选错=语义反馈（近对错→「都是银色，要看大小哦，大的是一元」/「数字一样，角和元不一样哦」按所点项线索引导）；章：ch1 硬币三兄弟/ch2 纸币认面额/ch3 同值+组合（近对必在干扰）/ch4 生成混合（随机章型同 §0.64）；每关 5 题；确定性 seeded；星级同上

66. **notebird 音阶小鸟真值**（本批新增）：**音符封闭 8**（C 大调上行：do=C4 261.63Hz/re=D4 293.66/E4-mi 329.63/fa=F4 349.23/sol=G4 392.00/la=A4 440.00/si=B4 493.88/do'=C5 523.25——频率表写死 data，**音频=Web Audio 合成（triangle osc+gain envelope：attack 0.02s/sustain/release 总时长 700ms，**首次用户手势创建 AudioContext 并 resume（自动播放策略），禁用任何 mp3 clip 充当鸟音**；TTS 与合成音互不掐断（不同通道）**）；**8 鸟视觉封闭**：颜色（do红/re橙/mi黄/fa绿/sol蓝/la紫/si粉/do'白）+电线站位左低右高按音序（do 最左→do' 最右）——**教学主线=「电线左边的声音低，右边的声音高」位置↔音高映射（读题/教学句锚定；实现用 M1 压缩版「电线左边低，右边高」9 字符——审查 M1：教学链总预算 ≤16s（watch 段到 __nbDemoR，含顺序唱 8×550 短唱窗+主线句窗 4100），verify 混合折算口径对齐 ruler/coin）**；每题场上 4 鸟（8 选 4，含答案）；题型两族——**听音找鸟**（find：场上一只鸟唱（合成音），「是哪只小鸟在唱？」点对那只——听→位置映射）与**谁高谁低**（higher：题面两只鸟各唱一次（左先右后，各 700ms+300 间隔），「谁的声音高？」候选=该两只+2 干扰，点高的那只）；**近对=相邻音**（higher 题两题面鸟音程 ≤2 度（相邻半音 mi-fa/si-do' 优先），干扰必含题面两只的另一只近邻）；选对=鸟跳+清唱该音+确认句 TTS；选错=语义反馈（find 错→「再听一遍，它的声音低低的/高高的」按答案音在所点与答案间的位置给方向：所点比答案低→「再往右找找，声音更高的」/所点比答案高→「再往左找找，声音更低的」；higher 错→「左边的声音低，右边的声音高，再听一听」）；题面重听按钮（🔊 再听一遍）恒在场（听辨类专属，不占救援钟语义）；章：ch1 认识小鸟（顺序唱 do→do' 演示+自由点鸟探索：「点一点，每只小鸟都会唱歌」）/ch2 听音找鸟/ch3 谁高谁低（近对）/ch4 生成混合（随机章型同 §0.64）；每关 5 题；确定性 seeded；星级同上

## §1 ruler 测量小尺（非标准单位测量+比较传递性）

**玩法**：物品+单位链题面+数字/物品卡点选。
- 题型（4 章）：ch1 count clip / ch2 count stick·block / ch3 cmp 陷阱对 / ch4 混合
- 反馈语义：count 按所点数字大小方向；cmp 按单位陷阱真值引导（锚「单位长，根数少也可能长」）
- 教学：watch=演示数一个（幽灵手指逐根点回形针+「一根一根数」）→帮/独；`__ruDemoR`
- 钩子：`RU = { get currentLevel, get quiz(){ kind('count'|'cmp'), item(物品 id), unit(单位 id), units(链长数=真值), opts[](数字卡 {num} 或物品卡 {id,unit,units}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`
- 语音：rul_tut_watch'看！用回形针量一量'/rul_tut_turn'你来数一数'/rul_hint'摆整齐再数一数'/rul_right'量对啦，真厉害'/rul_wrong'一头对齐再数一数'/rul_q'它有几根回形针长'（确认句/比较题面/数字 TTS 拼句豁免）

## §2 coin 硬币认钱（人民币认知+角元进率）

**玩法**：钱币题面+文字卡点选。
- 题型（4 章）：ch1 coin / ch2 bill / ch3 sameval·combo（近对必在干扰）/ ch4 混合
- 反馈语义：三线索锚定（数字+颜色+大小）；近对错→辨析引导句
- 教学：watch=演示认一枚（幽灵手指+「看看数字，认一认」）→帮/独；`__coDemoR`
- 钩子：`CO = { get currentLevel, get quiz(){ kind('coin'|'bill'|'sameval'|'combo'), face(题面钱币 id 或组合 id), opts[](文字卡 {text}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`
- 语音：coi_tut_watch'看！这是多少钱'/coi_tut_turn'你来认一认'/coi_hint'看看上面的数字'/coi_right'认对啦，真能干'/coi_wrong'再看看数字和颜色'/coi_q'这是多少钱'（组合题面「一枚一元，一枚五角」/确认句「两个五角，就是一元」TTS 拼句豁免）

## §3 notebird 音阶小鸟（音高听辨+位置映射）

**玩法**：合成鸟音题面+4 鸟卡点选。
- 题型（4 章）：ch1 认识小鸟（演示+自由探索）/ ch2 find / ch3 higher（近对）/ ch4 混合
- 反馈语义：位置映射锚定（左低右高）；find 错按所点与答案的高低方向
- 教学：watch=顺序唱演示（do→do' 逐鸟亮+「左边低，右边高」）→帮/独；ch1 题间可自由点鸟听音（点鸟=唱，不判对错不计 miss）；`__nbDemoR`
- 钩子：`NB = { get currentLevel, get quiz(){ kind('find'|'higher'), notes[](场上 4 音名), answer(索引), sang(题面已唱音名序列), step, miss }, tapBird(i), start(flat), autoSolve(), replay()（重听题面音） }`
- 语音：not_tut_watch'听！小鸟在唱歌'/not_tut_turn'你来听一听'/not_hint'再听一遍它的声音'/not_right'听对啦，耳朵真灵'/not_wrong'再听一听，谁的声音'/not_q'是哪只小鸟在唱'（higher 题面句「谁的声音高」TTS 拼句豁免；鸟音=AudioContext 合成禁 clip）

## §4 交付与验收（承 batch15-26 流水线）

语音预合成（gen_clips.py 扩 batch27 块：rul_ 6+coi_ 6+not_ 6=18 条，manifest=1103 ok=18 fail=0；**实长已量化**〔家族 H〕：rul_tut_watch 3360/rul_tut_turn 1896/rul_hint 2544/**rul_right 2496（判对后窗 ≥2796）**/rul_wrong 2880/rul_q 2448；coi_tut_watch 2976/coi_tut_turn 1752/coi_hint 2232/**coi_right 2472（判对后窗 ≥2772）**/coi_wrong 2568/coi_q 1944；not_tut_watch 3096/not_tut_turn 1752/not_hint 2304/**not_right 2664（判对后窗 ≥2964）**/not_wrong 2832/not_q 2448——等待窗按此+300 余量定；TTS 拼句窗按 SAPI ~345ms/字+300；notebird 鸟音不经 gen_clips）→ 3 agent 并行（任务书必带：家族契约 A-J 逐条（含 b26 新增 I 链豁免窗+J 语义句全程保留）/§0.64-66 真值逐条/钩子参数语义表/tapX 返回值语义=right/wrong 族/notebird AudioContext 手势解锁与 verify 页合成音断言法（spy 记 osc 频率序列非听音）/内存纪律单 page 串行）→ 首单元门禁（gate_common27.py：RU/CO/NB 钩子映射）→ 独立复验（探针先行+断言独立硬编码（b26 坑②：禁实现函数复算期望，三分区全覆盖）+fire-and-forget 防重入+dch 直读+TTS spy=speechSynthesis.speak 覆写（b26 坑④）+ruler 陷阱对真值按基准长独立复算+coin 组合值独立复算+notebird 音高比较独立复算（音名序非频率实测））→ 全量回归 → 两级入口（batch27/index.html 三卡+主入口 78→81+href 扫描）→ 反方审查（含语音掐断链实测+duration 辨别器+notebird 手势解锁真实页实证）+6 岁试玩（单 page 串行）→ 修复闭环 → 收官（6-7 段 24/30，总 81/90）

**审查修复记录（2026-09-10，REVIEW-BATCH27 fatal 0/major 1/minor 4 全修）**：M1 notebird 教学链 26.1s→14.3s（顺序唱 8×1000→8×550 短唱 450ms+主线句压缩 9 字符窗 4100+demo 判定跳确认句窗+ghost 800→500）+verify 混合折算口径 ≤16000 对齐 ruler/coin+build 教学链总预算断言 ≤16s；m1 estMs 口径三款统一全字符 n×345+600（ruler 窗 8500→8800/notebird 9500→10200=2832+150+estMs(18 字符 6810)+300/coin 9200 本达标仅注释）；m2 顺序唱延窗 3400→3600（裕量 204）；m3 复验脚本三处弱断言修（ruler cmp 死代码删/notebird ch1 点对=right 点错=free 不罚强断言/T6 越界探测先过唱窗）；m4 目录清理收官时执行。

**试玩修复记录（2026-09-10，REPORT-PLAYER-6yo-b27 P1×2+P2×3 处置，附二机制更正详见报告）**：①P1-2 coin `cnOf` CN 表缺 10/20 → yuan10/yuan20 确认句「这是undefined元」（12 次/会话；归因更正=十元/二十元非一元纸币）——CN 表补 `10:'十'/20:'二十'` 且 2 改「两」，七面额+三组合确认句运行时复验无 undefined；②P3-a ruler NUMCN 2:'二'→'两'（量词口语，verify SPEC_NUMCN 双录表同步）；③P2-3 三款 rescueTick 顶部加面板在场守卫 `querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')` → 面板遮挡期救援静默（原 118s 窗口重播读题 10 次）；④P1-1/P2-1/P2-2② 判定＝**试玩脚本漏设「今日多玩关数」的测试伪影**（bonusToday 恒 0→limit 恒 6→引擎合法重放 flat5；genLevel 无 RNG 漂移——`mulberry32(flat*7919+17)` 每关局部重建），但验证缺口成立 → verify_final27.py 新增 **R8 真实路径推进测试**（预置首日 6 关+`KIDS.calendar.bonusSet(5)`→autoSolve flat6-10→断言 dch=[2,2,2,2,3]+flat10 题型∈ch3 族+存档记录 2-1..3-0）——**后续批次 verify 必带真实路径推进项，verify 页 start() 直达不覆盖日历/多玩分支**；⑤P3-c coin 演示吞点不纯净＝测量伪影（三件门代码与 ruler 逐字同，探针两次读取间 watch 演示自身推进 step）；⑥登记家族待办：面板期引擎照常推进下一关/restTip 与 dayEnd 同屏叠加/「再玩玩旧关卡」只重放当前关不轮换（core/模板层，跨 81 款）。
