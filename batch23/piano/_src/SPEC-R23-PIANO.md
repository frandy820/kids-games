# SPEC-R23-PIANO · 碰碰琴难度加深增补（r23，2026-09-20）

依据：AUDIT-56 行24 黄款判定「听音序复现 2-4 音，4 音=5.5 岁上限对 6 岁半偏易」实测 19.6s/关；
行97 建议方向「序列 5-6 音、节奏维度（长短音）、双音和弦」。
校准：b23 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）——r21 colormix/r22 share 同口径。
本文件为 SPEC-BATCH23 §0.54/§3 的 r23 修订版，与其冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「兔子弹→孩子逐音复现」玩法骨架与教学链（flat0 watch→帮→独、演示 do-sol 定值、
`__piDemoR` 证据链零改动），消除「4 音封顶背旋律」上限：三个新认知维度分章爬升——
**长度上探**（dch3 4→5 音、dch4 长曲 6/5/5 音：听觉工作记忆 5-6 chunk）、
**节奏听辨**（dch4：兔子弹含长短音的曲子→问「哪个音最长」点键作答——时值辨别新作答面）、
**和弦听辨**（dch4：兔子同时弹两音→问「弹了哪两个音」选两键作答——音高聚合分辨新作答面）。
现状认知上限=逐音序列复现单一形态；改造后须在更长序列上维持音序记忆、对时值维度做
听觉辨别、对同时发声的音簇做音高分离，听音任务不再是单一「跟弹」形态。

审计三建议采纳方式：
- **序列 5-6 音（行97①）**：采纳。dch3 全章 4→5 音（含生成关 dch3 腿）；dch4 长曲腿
  改 6/5/5 音谱（qi0=6 音含首两音重复教学点、qi2/qi4=5 音、qi4 尾音 dosi 跨八度教学点
  ——两条 dch4 既有教学点全保留）。
- **节奏维度（行97②）**：采纳但降级为**听辨作答面**（r22 cmp 同构范式）。长按复现
  （孩子长按/短按区分时值）**否决**，理由：①长按判定须设按住时长阈值+宽容带，儿童
  （5-6 岁）按住时长的动作稳定性无法在本轮自测中证可靠——误判直接进 miss 挫败路径，
  与 §0.54 防挫败定版冲突；②家族无长按交互先例，教学链无法演示「按多久才算长」。
  听辨面（哪个音最长→点键作答）把时值从**动作产出**维度降为**听觉辨别**维度，判定
  确定性（答案=唯一长音的键），风险自证可达成。
- **双音和弦（行97③）**：采纳作答面形态（听和弦选出两音）。双指同时按两键复现
  **否决**，理由：①双指同按须引入时间窗聚合判定（两 pointerdown 落差多少 ms 算
  「同时」），窗宽容带同样无法自证；②现有事件模型一次 pointerdown 一音，双指判定
  与吞输入锁/busy 窗的交互组合爆炸；③6 岁儿童双指协调的动作可靠性无家族先例背书。
  听辨面（选两音集合判定）保留和弦的认知内核（音高分离/和声听辨）。

维度不叠同题：echo 题=纯音序；rhythm 题=纯时值（4 音互异，答案唯一性结构性保证）；
chord 题=纯音簇（2 音间距 ≥2，避开相邻音程的过分难度）。教学骨架（flat0
watch→help→solo）零改动；dch1/dch2 基线不动（r22 同款「基线不动」声明）；档键
'ch-lv'/CH_LEN=5/STATIC_LEVELS=20/难度章 (ch-1)%4+1 循环全不动；无迁移 IIFE。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键 'ch-lv' 全不动）

| 难度章 | 章名 | 型 | 每关 5 序列构成 | 新认知维度 |
| --- | --- | --- | --- | --- |
| 1 两个音（教学） | 2 音跟弹 | 原样（flat0 seq0 恒 [0,4] 不动） | 基线（原样保留，教学骨架不动） |
| 2 三个音 | 3 音跟弹 | 原样 | 基线（原样保留） |
| 3 五个音（原「四个音」） | **5 音跟弹** | 5 序列均 5 音，无同音连弹 | 长度上探（听觉工作记忆 5 chunk） |
| 4 小小音乐会 | 长曲+**节奏/和弦听辨** | qi0=echo 6 音（首两音重复）+ **qi1=rhythm 4 音**（恰 1 长音）+ qi2=echo 5 音 + **qi3=chord 2 音**（间距 ≥2）+ qi4=echo 5 音（尾 dosi） | 长度 6 上探+时值听辨+音簇听辨 |

- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：ch5/9/..=dch1、ch6/10/..=dch2、
  ch7/11/..=dch3（5 音）、ch8/12/..=dch4（长曲+节奏+和弦）。
- 旧 dch4「MIX_LEN=[4,3,2,4,3] 短混合谱」退役：混合训练值由 dch4 关内题型混合
  （echo/rhythm/chord 三形态共存）承载；重复音+跨八度 dosi 教学点由 qi0/qi4 echo 腿
  承接不丢失。难度改造目的即内容变化，已通关档无矛盾态（§R7）。

## §R3 生成律扩定（§3 r23 修订——四方同步红线）

- 种子通道不变：mulberry32(flat×7919+13)，同 flat 永远同关。
- dch1/dch2 生成律原样；dch3=genSeq(len=5)（步进 ±1..±3 无步 0，镜像折回）。
- dch4 每关固定题型谱（qi 即序列位）：
  - qi0：echo 6 音，forceRepeat（首两音重复，承旧 seq0 教学点）；步进池含 0。
  - qi1：**rhythm**——4 互异音（域 0-7 洗牌采样前 4）+ longIdx∈[0,3] seeded；
    恰 1 长音（答案唯一性=互异性结构性保证）。
  - qi2：echo 5 音（步进池含 0）。
  - qi3：**chord**——a∈[0,5]、b=a+ri(2,3)、b>7 则 b=a+2；两音互异且间距 ≥2
    （禁相邻音程：小/大二度同发人耳难分，非 6 岁可判域）。
  - qi4：echo 5 音，forceHigh（尾音 dosi=7，承旧 seq4 教学点）。
- 序列对象统一 `q.seq` 语义（echo=旋律序列/rhythm=4 互异音/chord=[a,b] 两音）+
  `q.mode`（'echo'/'rhythm'/'chord'）+ rhythm 专属 `q.longIdx` + chord 专属
  `q.sel`（运行态选择数组，初始 []）；`pos/miss/solved` 字段三 mode 通用
  （作答题 pos 恒 0 不参与判定）。
- 同关 5 序列签名互异：签名=seq.join(',')（dch4 内长度谱 6/4/5/2/5——qi2/qi4 同长
  5 靠内容互异+guard 重试；echo/rhythm/chord 天然长度分层）。
- **四方口径同步**：本节生成律必须 game-core.js（genLevel/genSeq/新 rhythm/chord
  生成）/ game-verify.js（①直驱答案推导）/ _selftest.py（py_gen_level 独立重实现）/
  verify_one_piano.py（主线，Python 独立复算）四处同源同步，缺一即独立复验红。

## §R4 新作答面机制（dch4 rhythm/chord 腿）

- **题面（listen 相位）**：
  - rhythm：兔子逐音弹 4 音曲——短音 dur 0.45s/键亮 ~0.55s，**长音 dur 1.9s/键亮
    ~1.9s+后停顿拉长**（时值可视化：键亮多久=时值表征，视觉先行——KIDS.audio.note
    的 dur 直接控制 exponentialRamp 衰减全程，0.45 vs 1.9 为 4 倍可听时长差，听辨
    域可靠；echo 题音长 1.05s 原样不动）。listen 末语音 pia_rhy_q「哪个音弹得最长呀」。
  - chord：兔子**两键同时亮+两音同时发**（每音 vol 0.6 防 linear 叠加削波），停
    ~1.4s；listen 末语音 pia_cho_q「兔子弹了哪两个音呀」。
- **作答面（play 相位）**：琴键即选项（无新控件，布局零变化）。
  - rhythm：点任一键即作答——点中长音键=right/done 推进；点其他键=wrong
    （miss+1，不换题可重选——探索≠错，r22 cmp 同款）。点的键出声（听自己选的音，
    对照回忆——音本身即反馈特例延续）。
  - chord：选择集聚合判定——点键 1=选中（.sel 持续亮，返回 'pick'，不判不罚不
    占 busy）；点第 2 键即自动判定：集合={选1,选2} 与 seq 集合相等→right/done
    （两键齐 good），不等→wrong（miss+1，**sel 清空可重选**）；点已选键=取消该键
    （.sel 灭，返回 'same'，不判不罚）。
- **吞输入守卫**：作答题与 echo 同门（demo/locked/听音相位/busy 拦截+pop+bump）；
  wrong 后 busy 窗 200+800ms（echo 同款防重入）。
- **星级口径公平性论证（r23 定版）**：rhythm/chord 的 wrong=探索性错选（可重选不
  换题），与 echo 的弹错（miss+1 当前音重试）**同构同档**——单次错误成本等价
  （均计 1 miss 入 missTotal），分档边界 0=3★/1-2=2★/≥3=1★ 与永不 0 星全不动。
  错误机会面论证：作答题单题恰 1 个判定点（echo 单题 5-6 个音位点），全关 miss
  期望不因新维度膨胀；纯 echo 关（dch1-3）行为与 r23 前完全一致（向后兼容）。
- **首次新作答视觉预告**（每存档一次，sv.piano.ansSeen）：进 dch4 关时 8 键次第
  tease 波浪一遍（.tease 类，预告「琴键可点选」不指示正确答案——承 r21 revSeen/
  r22 ansSeen 范式）+正常读题面。verify 页不写档、每次 start(dch4 关) 重触发
  （⑯断言口径）。
- **救援两级适配**：
  - 14s 方向级（不泄答案）：echo=原样（当前应弹键 flash+重听该音）；rhythm/chord=
    **重弹全曲**（runSequence 重发——听辨题的材料重听即方向提示）+sayR(pia_hint)
    「先听兔子弹哦」。
  - 30s 答案级（可指真值，承家族先例）：echo=原样（应弹键 breathe 循环）；
    rhythm=长音答案键 breathe；chord=两答案键齐 breathe。
- replay 按钮（底栏重听）对作答题=重弹全曲（runSequence mode 分支自动适配）。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- genLevel：dch1/dch2 原样（flat0 seq0=[0,4] 钉死不动）；dch3=CHAPTERS[3].len=5；
  dch4 按 §R3 题型谱生成（qi0/2/4 echo+qi1 rhythm+qi3 chord）。MIX_LEN 常量退役删除。
- genSeq：原样通用（len 参数化已支持 5/6；forceRepeat/forceHigh 语义不变）。
- engTapKey(L,name) **重载 mode 分支**（不新增钩子函数——作答面=琴键，与 echo 同
  tapKey 通道，gate/verify 驱动零适配成本）：
  - echo：原样逐音比对（right/done/won/wrong/null）。
  - rhythm：name===NOTE_IDS[seq[longIdx]]→done/won（单点即成——关内非末题=done/
    末题=won，right 不在返回域）；否则 wrong（miss+1 不推进）。
  - chord：sel 聚合——已选键=移除返回 'same'；新键入 sel，sel<2 返回 'pick'；
    sel=2 判定：集合相等→done/won（推进——单点即成同 rhythm，right 不在返回域，
    与主线 verify_one 收紧断言对齐）；不等→sel 清空+miss+1 返回
    'wrong'。null 语义（非法名/关结束）三 mode 通用。
- engStars/engWon：不动（§R4 口径论证）。
- structWhy 扩展（单题函数，检题级域）：dch4 mode↔qi 对应（qi1 恒 rhythm/qi3 恒
  chord/其余 echo）/ rhythm 分支（len=4+互异+longIdx∈[0,3]）/ chord 分支（len=2+
  互异+间距≥2+sel 初始空）/ echo 分支（len=D4 谱+域 0-7+qi0 首两音重复+qi4 尾 7）；
  dch1-3 分支原样（len 按章自动适配 dch3=5）。**关级构成断言（dch4 恰 1 rhythm+
  恰 1 chord+echo 腿长度 ≥2 种）不在 structWhy——在 game-verify ① 聚合单元。**
- **PI 钩子**（gate G2 教学链断言不能断——flat0 纯 echo 不受影响）：PI.tapKey 透传
  新返回值（'pick'/'same'）；PI.quiz 增 mode/longIdx（rhythm）/sel 拷贝（chord）；
  PI.autoSolve 按 mode 分支（echo=逐音/rhythm=点长音键/chord=点 chord 两键）；
  window.__piDemoR 与 flat0 教学链零改动。
- runSequence（listen 相位机）mode 分支：echo=原样 620ms 逐音；rhythm=短/长音差异化
  时长（§R4）；chord=两键齐亮齐发。renderSeqDots 通用（chord=2 点齐脉冲/rhythm=4
  点逐个脉冲/echo 原样；作答题 play 期 dots 无 cur——无音位概念）。

## §R6 语音键账（6 既有注入全不变照用；新增 3 键上报主线 gen_clips 中央登记）

| key | text | 用途 |
| --- | --- | --- |
| pia_rhy_q | 哪个音弹得最长呀 | rhythm 题面/救援重读（新） |
| pia_cho_q | 兔子弹了哪两个音呀 | chord 题面/救援重读（新） |
| pia_ans_wrong | 再听一听，再选一次吧 | rhythm/chord 答错鼓励（新，探索可重选语境；echo 弹错仍用 pia_wrong 不混用） |

既有 6 条（pia_ 5+core 3 中 pia 部分）全照用：pia_tut_watch/pia_tut_turn（教学链
零改动）、pia_hint（作答题 14s 救援复用「先听兔子弹哦」+echo 原样）、pia_right
（作答答对复用「弹对啦，真好听」——广义「弹对」语境成立）、pia_wrong（echo 弹错
原样）、pia_like（演示收束语原样）。题面/答错语音不受 flat<3 门（§0.5 同理：不
识字孩子听不到题面=不知道问什么=不可收；作答题在 flat15+ 出现，flat 门下永不播）。
注册前新键**静默无声**——core TTS 通道已删（Task#46 阶段3，speak 改静默 drop），
无文本自愈兜底；**新键必须先注册后交付**（审查m1：家族后续款勿照抄「先上线后注册」）。
build.py clips 断言改子集式：「9 必备键精确在册+总数 ≥9」（主线注册 3 新键后 12
亦过，防注册前后断言漂移——r20/r21/r22 范式）；game-verify ⑫ 同步子集式。

## §R7 存档与迁移

**无档结构变化，无迁移 IIFE 需求**：档键 'ch-lv'（keyOf）、CH_LEN=5、
STATIC_LEVELS=20、日历语义、sv.piano.tutSeen 全不动。新增运行态子键
sv.piano.ansSeen（首次新作答视觉预告一次性标记）：旧档无此键=falsy=首次进 dch4
再触发一次 tease，无害幂等（r21 revSeen/r22 ansSeen 同款声明）。难度章内容变化只
影响未玩关的生成内容（难度改造目的本身）；已通关记录与新代码无矛盾态（r20/r21/r22
同款声明）。运行态新字段（mode/longIdx/sel）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep `== N` 逐处同步）

- **build.py**：`n_clips == 9` → `>= 9`（子集式，§R6）；PIA_KEYS/CORE_KEYS 9
  必备键清单不变精确。
- **game-verify.js**：①直驱按 mode 分支推导答案（echo 原样/rhythm=点 seq[longIdx]/
  chord=点 seq 两键，expect 数组对齐 'pick' 返回）+dch4 聚合断言改
  hasRep/hasHi/echoLens≥2 种/rhyN===1/choN===1/qi1 mode/qi3 mode；⑫clips
  `keysC.length === 9` → `>= 9` 子集式；⑬CHAPTERS/GEN_HINTS 新文案关键词断言
  （'五个音'/'长音'/'双音'）；新增 ⑮rhythm/chord 作答语义单元（flat15 真实 UI：
  wrong 不换题可重选/pick 选中 .sel 在场/same 取消/正确 done 推进/won 收口）⑯
  首次新作答预告单元（.tease 在场）——total 54→**56**（新旧对照：原 ①40 关+dch4
  聚合 1+②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭ 各 1=54；新增⑮⑯各 1）。头注章型描述同步。
- **_selftest.py**：py_gen_level 按 §R3 新算法独立重实现（dch3 len5+dch4
  题型谱+rhythm 洗牌/chord 间距律），对拍字段扩 mode/longIdx（chord 的 sel 运行
  态初始 [] 恒定不对拍）；第 4 部分引擎语义 flat0 原样；布局 flat15 量测照旧
  （作答面=琴键无新控件）；正常模式主流程 flat0 原样；**本轮补齐 MUTE 静音双保险**
  （piano 原版缺——r19 教训：speechSynthesis no-op+Audio.play 派发 ended+种档
  sound:false 全字段，verify 页与正常模式 pg2 每 goto 前挂 init_script，块体=任务书
  指定原文）。**⑭「verify 页零写档」断言随 MUTE 种档适配**：lsPiano===null 改为
  首末快照相等（lsBase 开头取基线）——语义=verify 流程零写档不变，无 MUTE 前置
  （主线直跑）时 null===null 同过。
- **verify_one_piano.py**（主线职责，本文件声明适配清单不实施）：C1 章域 Python
  独立复算扩 dch3 len5+dch4 题型谱（恰 1 rhythm+恰 1 chord+echo 腿长度谱）；驱动
  分支按 mode 推导答案（rhythm=seq[longIdx]/chord=两键聚合——两次 tapKey）；
  星级断言不变（miss 口径未动）；G3 NCLIPS 传参由主线注册 3 新键后自行更新 9→12。
- **gate_common23.py / verify_batch23.py**：piano 腿语义未变（G2 flat0 教学关
  dch1 纯 echo 无新作答），零改动。

## §R9 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×800+800×1180）全过 **56/56** ③_selftest
全绿 ④verify_one_piano 全绿（主线）⑤gate G3 n=9（注册前）/12（注册后，主线传参）
⑥新语音 3 键上报（games=['piano']）⑦本文件 ⑧0 pageerror+0 http。
