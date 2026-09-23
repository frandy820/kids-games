# SPEC-R22-SHARE · 分糖果难度加深增补（r22，2026-09-20）

依据：AUDIT-56 行35 黄款判定「平分2-3份有数学结构,糖数≤12域小」实测 33s/关；
行96 建议方向「份数 4、非整除比较（分不均谁多/差几颗）、等分反推（乘法前概念）」。
校准：b23 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）。本文件为 SPEC-BATCH23 §0.53+§2 的
r22 修订版，与其冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「两击制分糖+engJudge 自动判定」玩法骨架与教学链（flat0 watch→帮→独、演示
n=2 k=2 特例全不动），消除「糖数≤12 域小、整除/剩余两张表背完即全解」：三个新认知
维度分章爬升——**份数 4**（4 碗轮转分配：工作记忆负荷↑+余数感知域扩）、
**非整除比较**（已分好的不均碗阵：谁多=计数比较 / 差几颗=减法前概念——新作答面）、
**等分反推**（每碗 X 颗 × K 只 → 总数：乘法前概念——新作答面）。
现状认知上限=「n%k 整除性查表 + 逐颗轮转」肌肉流程；改造后须在 4 碗域上维持轮转
节奏、对静态分布做计数比较与差值判断、从「每份×份数」聚合总数，平分不再是唯一
问题形态。

审计三建议采纳方式：
- **份数 4（行96①）**：采纳，落 dch3 全章（含生成关 dch3 腿）。dch3「分不完」从
  k∈{2,3} 扩为 k∈{2,3,4}，每关恰 2 题 k4 剩余（POOL_REM4 6 对新池）+3 题 k2/3 剩余。
  不进 dch2（「分三家」章名/hint/整除纯度不动；k4 首次登场即带余数语境=「分不完
  的更多」认知爬升，且 4 碗整除域 {4,8,12} 过窄不适合独立成腿）。
- **非整除比较（行96②）**：采纳，落 dch4（新作答面章）。「谁多」=K 只动物碗已
  分好（不均、唯一最多），点动物作答；「差几颗」=唯一最多碗 vs 唯一最少碗差
  d∈{1,2,3}，数字钮作答。与「无错误路径」的关系（§0.53 定版只约束分糖过程）：
  照 r21 par 定夺先例——**即时层不惩罚**（选错=wiggle+sha_wrong+不换题可重选，
  探索式选择而非错误路径）+**星级结算层容纳**（答错计 qMiss，与取回同入星级口径，
  分档边界不动，永不 0 星）。
- **等分反推（行96③）**：采纳，落 dch4（与比较混合成章，r21 ch4「配方反推」同构
  范式）。题面=K 只动物各一碗、每碗恰 X 颗（静态展示），问「一共有几颗」→数字钮
  作答（候选 4：正确 X×K+干扰 3，固定含 X+K「乘当加」典型混淆项）。

维度不叠同题：k4 剩余题=份数+余数 2 维；cmp/rev 每题单维。教学骨架（flat0
watch→help→solo）零改动；档键 'ch-lv'/CH_LEN=5/STATIC_LEVELS=20/难度章 (ch-1)%4+1
循环全不动；无迁移 IIFE。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键 'ch-lv' 全不动）

| 难度章 | 章名 | 型 | 每关 5 题构成 | 新认知维度 |
| --- | --- | --- | --- | --- |
| 1 分两家（教学） | k=2 平分 | POOL_D2={2,4,6,8,10}（flat0 题0 恒 (2,2) 不动） | 基线（原样保留） |
| 2 分三家 | k=3 平分 | POOL_D3={3,6,9,12} | 基线（原样保留） |
| 3 分不完 | 剩余题 **k∈{2,3,4}** | **恰 2 题 k4（POOL_REM4）+ 3 题 k2/3（POOL_REM）**，seeded 洗牌+相邻不同 | 份数 4（4 碗轮转+余数域扩） |
| 4 公平大师 | **比较+反推新作答面** | qi0 恒 cmp-who 热身；qi1-4 掷硬币 cmp/rev，保底各 ≥1；cmp 腿 ask 掷 who/diff，保底 diff ≥1（仅 1 题 cmp 时豁免） | 非整除比较+等分反推 |

- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：ch5/9/..=dch1、ch6/10/..=dch2、
  ch7/11/..=dch3（含恰 2 题 k4）、ch8/12/..=dch4（比较+反推）。
- 旧 dch4「整除+剩余混合」腿退役：混合训练值由 dch3 域内混合（k2/3/4 剩余共存）与
  dch4 cmp 题的非整除分布场景承载；难度改造目的即内容变化，已通关档无矛盾态（§R7）。

## §R3 题库与池扩定（§2 r22 修订——四方同步红线）

```js
POOL_REM  = [[5,2],[5,3],[7,2],[7,3],[8,3],[10,3],[11,2],[11,3]]        // 原样 8 对
POOL_REM4 = [[5,4],[6,4],[7,4],[9,4],[10,4],[11,4]]                      // 新 6 对（余 1-3 <4 天然满足）
CMP_WHO   = [[4,2],[4,3],[5,3],[5,4],[6,4],[6,5],                        // 唯一最多（k=2）
             [3,2,2],[4,2,2],[4,3,3],[5,3,3],                            // 唯一最多（k=3）
             [3,2,2,2]]                                                  // 唯一最多（k=4）
CMP_DIFF  = [[3,2],[4,2],[5,2],[5,3],[6,3],[6,4],[7,4],                  // d=1,2,3,2,3,2,3（k=2）
             [4,3,1],[4,3,2],[5,3,2],[5,4,2]]                            // d=3,2,3,3（k=3；unique max+min
                                                                         // ——k3 的 d=1 三碗两值结构性双唯一不可得）
REV 域     = X∈{2,3} × K∈{2,3,4}（X=1 太易不收；X*K ≤12 域内：4/6/8/6/9/12）
```

- cmp 的 ask 语义：who=「谁的糖果多」（作答=唯一 argmax 碗）；diff=「多几颗」
  （作答=max−min∈{1,2,3}，唯一 max 且唯一 min）。
- **四方口径同步**：本节池表必须 game-data.js（池本体）/ game-core.js structWhy /
  verify_one_share.py（Python 独立池）/ _selftest.py（PY 池）四处同源同步，缺一即
  独立复验红。
- 数字钮候选 opts（确定性生成，呈现位 seeded 洗牌）：
  - diff 题：正确 d + 干扰自 [d−1,d+1,d+2,d−2,d+3]∩[1,5] 去序取 3 → 恰 4 钮。
  - rev 题：正确 P=X·K + 干扰自 [X+K,P−1,P+1,X·(K−1),P+2]∩[1,12]≠P 去序取 3 → 恰 4 钮；
    X+K 固定优先位（「乘当加」典型前概念错误——6 组合均有 d≠P 或后续位补齐，已验）。

## §R4 新作答面机制（dch4）

- **题面**：
  - cmp-who：题面 chip = 问号图形+大问号+箭头+首动物图形+大 K；语音 sha_cmp_who
    「谁的糖果多呀」。场地：K 站碗内糖=dist（静态、不可取回）。
  - cmp-diff：题面 chip = a 颗迷你糖+大数字 a + 箭头 + b 颗迷你糖+大数字 b（a=最多
    碗数、b=最少碗数，双表征）；语音 sha_cmp_diff「多几颗呀」。
  - rev：题面 chip = X 颗迷你糖+大数字 X + 箭头 + 动物图形+大数字 K（「每碗 X 颗×
    K 只」双表征）；语音 sha_rev_q「数一数，一共有几颗糖呀」。
- **作答面**：
  - cmp-who：点动物站即作答（station 复用为作答钮，≥64）。
  - cmp-diff / rev：托盘区渲染数字钮排 .numkey ×4（≥64，点钮报数词 sha_n_*）。
  - **报数让位窗（审查 M1 收官补）**：core voice.play 为打断式——数字钮反馈句（sha_wrong/
    sha_ans_right）一律延迟 500ms（verify 页 0ms），让报数词先说（r21 colormix m5 同型范式）；
    真实页序列由 _selftest 5b pointer 流+试玩非 stub 复核覆盖。
  - cmp-who 时托盘区渲染问号大钮（点=重读题面，轻回应不空区）。
- **判定**：engPickAnimal(L,j)（仅 cmp-who 受理）/ engPickNum(L,i)（仅 cmp-diff 与
  rev 受理）——正确→right/done 推进（复用 engAdvance）；错误→'wrong'（tries++、
  L.qMiss++，选中钮/站 wiggle+sha_wrong，**不换题可重选**——探索≠错）；重复点同
  钮='same' 不判不罚（承 colormix same 语义）；越界=null→UI false+bump。
- **星级口径扩展（r22 定版）**：探索总成本=取回次数 takebacks+答错次数 qMiss，
  0=3★ / 1-2=2★ / ≥3=1★（分档边界与永不 0 星全不动）。纯分糖关（dch1-3）qMiss
  恒 0，行为与 r21 前完全一致（向后兼容）。
- **分糖通道守卫**：cmp/rev 题 engTapCandy/engTapBowl/engTakeBack 返回 null（UI
  false+容器 bump）；cmp/rev 题点碗内糖不进取回分支（事件委托按 mode 分流）。
- **演出**：cmp-who 答对=正确动物站跳+吃糖；diff/rev 答对=全场跳+吃糖；
  sha_ans_right「数对啦，真厉害」+3200ms 窗（新 clip 未实测前按 sha_right 同窗
  保守值，主线生成后可复测微调——注册前 text 兜底播报）。
- **首次新作答视觉预告**（每存档一次，sv.share.ansSeen）：数字钮/动物站次第
  bounce 一遍（.tease，预告可点不指示正确答案——承 r21 revSeen 范式）+正常读题。
  无专门教学关（flat15 是中途关，不设 watch 演示替答）；verify 页不写档、每关重
  触发（⑮ 断言口径）。
- **救援适配**：14s 方向级=重读题面+作答排轻 pulse（who=全部站统一 pulse 不泄答案
  /diff·rev=数字钮排 pulse）；30s 答案级=幽灵手指指正确站/正确数字钮（承答案级
  可指真值先例）。空白点击轻提示复用 sha_hint「数数每只碗里几颗」（cmp/rev 语境
  均贴切）。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- mkQuiz 增 mode:'split' 字段（旧字段全保留）。新增：
  - mkCmpQuiz(dist, ask, kinds)：{mode:'cmp', ask, k=dist.length, n=Σdist, kinds,
    dist, opts(diff 时 4 钮), picked:-1, tries:0, solved:false, trayIds:[], _bowlIds:
    dist 各碗预填, plateIds:[], _sel:null, _ready:false, miss:0}。
  - mkRevQuiz(x, k, kinds)：{mode:'rev', x, k, n=x*k, dist=[x]*k, opts, …同上}。
- genLevel：dch1/dch2 原样（flat0 题0 钉 (2,2) 不动）；dch3=恰 2 题 POOL_REM4+3 题
  POOL_REM 洗牌+相邻 (n,k) 不同；dch4=dch4Plan（qi0 恒 cmp-who；qi1-4 掷 cmp/rev
  保底各 ≥1；cmp 腿 ask 掷 who/diff 保底 diff ≥1）+池采样相邻签名不同。
  remFlagsOf/sampleParams 的 dch4 分支退役删除。
- engPickAnimal/engPickNum（新，语义见 §R4）；engTapCandy/engTapBowl/engTakeBack
  对 mode!=='split' 返回 null；engJudge 对 cmp/rev 恒 'none'（判定不适用，作答驱动）。
- engStars 扩口径 (takebacks||0)+(qMiss||0)（§R4）；engWon/engAdvance 不动。
- structWhy 扩（单题函数）：cmp 分支（mode/ask/池表含 dist/opts 4 钮含正确域内
  无重/kinds 合法/相邻约束（**同 ask 相邻者 dist 须不同**；who→diff 同 dist 相邻允许——同碗阵
  两种问法非重复题，审查 m4 措辞修正）/碗=dist 初始态/picked=-1·tries=0）、rev 分支
  （mode/x∈{2,3}/k∈{2,3,4}/opts 4 钮含 X·K/kinds/相邻 (x,k) 不同/碗=x 初始态）、
  split 分支加 mode==='split' 断言。**关级构成断言（dch3 恰 2 题 k4 / dch4 保底
  各 ≥1、qi0=who）不在 structWhy——在 game-verify ① 聚合单元 k4PerLv/dch4Mix。**
- **SH 钩子**（gate G2 教学链断言不能断）：SH.pickAnimal(j)/SH.pickNum(i) 新增；
  SH.quiz 增 mode/ask/x/opts/picked/tries（split 时 mode='split' 旧字段全在）；
  SH.currentLevel 增 qmiss；SH.autoSolve 驱动 cmp-who=argmax(bowls)、cmp-diff=max−min、
  rev=x*k 选 opts 索引；tapCandy/tapBowl/takeBack/tapPlate 对 cmp/rev 返 false。
  window.__shDemoR 与 flat0 教学链零改动。

## §R6 语音键账（43 既有注入全不变照用；新增 11 键上报主线 gen_clips 中央登记）

| key | text | 用途 |
| --- | --- | --- |
| sha_q_5_4 … sha_q_11_4（6 条） | {N}颗糖，分给四只小动物，每只一样多（N∈5,6,7,9,10,11） | k4 剩余题面整句（新） |
| sha_cmp_who | 谁的糖果多呀 | cmp-who 题面/救援重读（新） |
| sha_cmp_diff | 多几颗呀 | cmp-diff 题面/救援重读（新） |
| sha_rev_q | 数一数，一共有几颗糖呀 | rev 题面/救援重读（新） |
| sha_wrong | 再数一数吧 | cmp/rev 答错鼓励（新，探索可重选） |
| sha_ans_right | 数对啦，真厉害 | cmp/rev 答对（新） |

既有 43 条（sha_ 40+core 3）全照用：题面 sha_q_{n}_{k}（k∈{2,3} 22 条）、数词
sha_n_0..12（数字钮点选报数复用）、教学/hint/right/plate 5 条。答对分糖题复用
sha_right（不新建）。
**games 限定红线**：sha_ 前缀与 shadow 撞车（20 条同名前缀异主，键名不重叠）——
新 11 键 manifest 注册时 games 数组必须恰为 ['share']（禁含 'shadow'，防 G3 串款
对账误注入）。注册前新键由 KIDS.voice.play(key,text) 文本自愈（core 契约），无害。
build.py clips 断言改子集式：「43 必备键精确在册+总数 ≥43」（主线注册 11 新键后
54 亦过，防注册前后断言漂移——r20/r21 范式）；game-verify ⑩ 同步子集式。

## §R7 存档与迁移

**无档结构变化，无迁移 IIFE 需求**：档键 'ch-lv'（keyOf）、CH_LEN=5、STATIC_LEVELS=20、
日历语义、sv.share.tutSeen 全不动。新增运行态子键 sv.share.ansSeen（首次新作答
视觉预告一次性标记）：旧档无此键=falsy=首次进 dch4 再触发一次，无害幂等（r21
revSeen 同款）。难度章内容变化只影响未玩关的生成内容（难度改造目的本身）；已
通关记录与新代码无矛盾态（r20/r21 同款声明）。运行态新字段（mode/ask/x/opts/
picked/tries/qMiss）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep `== N` 逐处同步）

- **build.py**：`n_clips == 43` → `>= 43`（子集式，§R6）；必备 43 键清单不变精确。
- **game-verify.js**：头注②「六组 (n,k)」漂移顺手修（实为 10 组，r22 扩 k4 对拍后
  12 组）；①直驱分支处理 cmp/rev（Python 侧正确答案推导→engPickAnimal/engPickNum）
  +聚合改 k4PerLv（dch3 恒 2 题 k4）+dch4Mix（每关 cmp≥1+rev≥1+qi0=who）；②PAIRS
  加 [5,4],[11,4]（k4 判定对拍，四重循环全组合态）；⑤冒烟 flat15（dch4）autoSolve
  适配新作答（want=5）；⑥星级加 qMiss 维直测；⑨布局加 k4 关+cmp/rev 关量 .numkey
  （simView 分支 cmp/rev 不填糖）；⑩clips `keys.length === 43` → `>= 43` 子集式；
  ⑪CHAPTERS/GEN_HINTS 新文案关键词断言；⑫quizSpeech k=4 断言+cmp/rev 文案自洽；
  新增 ⑭cmp/rev 作答单元（flat15 真实 UI：字段完备/分糖守卫 wrong 不换题/same/
  right 推进/非法 false）⑮首次新作答视觉预告单元（.tease 在场）——total 53→**56**。
- **_selftest.py**：新增 MUTE 静音双保险（r19 教训：speechSynthesis no-op+Audio.play
  派发 ended+种档 sound:false，每页面 goto 前挂 init_script——share 现缺，r22 补齐）；
  PY 池扩 POOL_REM4/CMP_WHO/CMP_DIFF/REV 域（四方红线）；py 判定对拍扩 cmp/rev
  （Python 独立复算正确答案）；第 4 部分布局加 k4 关+cmp/rev 关 .numkey 量测；
  **6b ansSeen 种档断言（种 ansSeen:true → flat15 50ms 轮询 1.2s 无 .tease）**。
- **verify_one_share.py**：新增 MUTE 块（同上）；S1 章域 Python 独立池扩（REM3 5 元素
  子集口径 → REM 14 对全表+dch3 恰 2 题 k4 聚合+dch4 flat15-19/35-39 cmp/rev 域
  Python 复算：mode/池表/opts 含正确）；S3 驱动 mode 分支（cmp-who=argmax→
  pickAnimal / cmp-diff=max−min→pickNum / rev=x*k→pickNum）；S5 星级加 qMiss 口径
  +S5c「答错 1 次=2★」（dch4 抽关）；S6 确定性含 cmp/rev 快照字段自洽。
- **gate_common23.py / verify_batch23.py**：share 腿语义未变（G2 flat0 教学关 dch1
  无新作答），零改动；G3 NCLIPS 传参由主线在注册 11 新键后自行更新 43→54（本文件
  声明，gate 调用方传参）。

## §R9 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×800+800×1180）全过 **56/56** ③_selftest
全绿（含 MUTE/6b ansSeen）④verify_one_share 全绿（S0-S6b+S5c）⑤gate G3 n=43
（注册前）/54（注册后，主线传参）⑥新语音 11 键上报（games=['share']）⑦本文件
⑧0 pageerror+0 http。
