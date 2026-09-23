# SPEC-R49-ETM — etm 表情温度计 难度改造轮⑤批二（r49）

改造对象：`batch39/etm/`（源码 `_src/`，产物 `../index.html` 单文件——段二终态 1429454 chars/48 clips 注入；段一为 796065/28 clips）。
基线：r48 之前 b39 原版（20 题题库/**三档强度 l1/l2/l3**（副词级微调，含已退役 paintspill/longwait 两题）/无组合情绪）。**r49-fix M1a 勘正**：原写「两档 l1-l2」与自引证据矛盾——审计原话「ch3-4 强度三档是真内容」+baseline 谱 flat10/15/20 level 题 picks 全三元 [l1,l2,l3] 型，基线实为三档，本轮实为**三档→五档**。

## R1 改造维度（审计 AUDIT-67 行 39 裁量）

审计判定 🟡 实测 46.9/34.4s：「ch1-2 情境直白=3-4 岁配对；ch3-4 强度三档是真内容」。
按审计建议执行三维度：

| 维度 | 基线 | r49 终态 |
|---|---|---|
| face 族情境 | 20 题全直白（情绪词显式） | ch2 换 5 间接情境（情绪须推断：金鱼浮水面→难过/黑屋衣柜门开→害怕），生成关 dch2 扩展池 5 题同口径间接 |
| level 强度档 | 3 档（l1/l2/l3 副词级微调——6.5 岁误判前科，r49-fix M1a 勘正） | 5 档后果阶梯（l1 无意轻轻→l2 单次冒犯→l3 重复侵扰→l4 故意破坏→l5 破坏+羞辱），每档签名线索类独立 |
| 情绪粒度 | 单情绪 4 选 1 | 新增 mix 族：4 组合双拼脸（happy+scared/happy+sad/angry+sad/angry+scared），4 基情绪各现 2 次（平衡环） |
| 题库规模 | 20 题 | 40 题（静态 20 + 每章扩展池 5×4；生成关池=静态章 5+扩展池 5） |

**档键基不变**：CH_LEN=5、STATIC_LEVELS=20、存档键 `kidsgame_etm` v1.0、seed 常量 867——
无档迁移需求（旧档 levels['ch-i'] 键语义连续，r49 关卡号与章结构零变化）。

## R2 章谱（静态 20 关=flat0-19）

| 章 | flat | 族 | 候选数 | 题材池（QUESTIONS 行号） |
|---|---|---|---|---|
| ch1 认识心情 | 0-4 | face | 4 | rows0-4（直白——**flat0 教学锚面逐字节保留**） |
| ch2 心情小侦探 | 5-9 | face | 4 | rows5-9（间接 5 新题） |
| ch3 心情温度计 | 10-14 | level | 5 | rows10-14（五档阶梯） |
| ch4 复杂心情 | 15-19 | mix | 4 | rows15-19（组合情绪 5 新题） |

（r49-fix m2 勘正：章名列以 game-data.js CHAPTERS 实名为准——认识心情/心情小侦探/
心情温度计/复杂心情；原表「心情藏着线索/生气温度计/两种心情」系旧稿漂移，`.name`
运行时零引用仅 `.hint` 被消费。）
| 生成关 | 20+ | 随 dch | 4/5/4 | dch 分池=本章静态 5+扩展池 5（rows20-39） |

生成关 dch 分池（engine `POOL_ROWS`）：
dch1=rows[0-4,20-24] face 直白 / dch2=rows[5-9,25-29] face 间接 / dch3=rows[10-14,30-34] level / dch4=rows[15-19,35-39] mix；
族映射 `KIND_OF_DCH={1:face,2:face,3:level,4:mix}`（level 族候选=5）。

## R3 生成规则（承基线零变化部分 + r49 改写部分）

**承基线不动**：`mulberry32(flat*7919+867)`；静态关取材 rotate 公式 `rows=[base+(lv+k)%5]`；
生成关 `dch=ri(rnd,1,4)` 第一个随机数 + 无放回抽 5 行；每题 seeded Fisher-Yates 盘序；
`structWhy` 校验（wantN=level?5:4）。

**r49 改写**：`POOL_ROWS` **四池成分重组**（r49-fix M1b 勘正：原写「扩容每池 5→10」不实——
基线 dch1 池已是 10 行（两 face 章合池，baseline flat33 抽出 lostmom 实证）；真实变化=dch1
索引等价重排（rows20-24 为旧 rows5-9 逐字迁移）/dch2·dch4 换新题/dch3 三档重判五档）、
`KIND_OF_DCH` 新增（原为全 face+三档混合）、
题库 20→40、`poolOf` 新增 mix 分支。

**level 五档设计**（副词微调前科的根治——每档签名线索类独立，verify ⑥/pycheck 双侧先验断言）：

| 档 | name | 签名线索类 | 静态题 | 扩展池题 |
|---|---|---|---|---|
| l1 | 有点生气 | 不小心/轻轻 | crayondrop 有人不小心碰掉了你的蜡笔 | stepfoot 排队时被轻轻踩了一脚 |
| l2 | 生气 | 抢走/插队 | snatchtoy 有人抢走你手里的玩具 | queuejump 有人插队，一下站到了你的前面 |
| l3 | 很生气 | 一直/总是 | swinggrab 有人一直抢你的秋千 | interrupt 你说话总是被人打断 |
| l4 | 非常生气 | 故意 | castlekick 辛苦搭的城堡被故意踢倒 | modelcrush 有人故意踩坏了你拼好的飞机 |
| l5 | 要爆发了 | 还笑/做鬼脸 | ruinlaugh 有人弄坏了你的画还笑你 | tearbook 有人撕了你的故事书还做鬼脸 |

**mix 唯一解论证**（铁律⑫）：每题文本恰命中其组合两情绪的线索词、零第三情绪词
（独立情绪线索表：happy=[开心,高兴,喜欢]/angry=[生气,气得,又气,很气]/sad=[难过,伤心,舍不得,想哭,掉眼泪,心疼]/scared=[害怕,怕,担心,吓]）。
verify ⑥ cueMix + pycheck cue 律双侧断言「命中情绪集合==组合两情绪恰两个」→ 候选盘
4 组合脸中答案唯一。

**温度计五档可辨性**（铁律⑫）：水银停位 14/34/54/74/93%（相邻 Δ=20/20/20/19%），
横版实测 Δ=[20.4,20.4,20.4,19.4]px、竖版推算 [17.4,17.4,17.4,16.5]px，均 ≥ 可辨阈值 15px；
5 刻度 tk1-tk5 与停位对齐；顶档 93% 留头部圆角区防刻度被裁。竖屏 5 项候选 2 列网格
（单列 84px<96 触目标不达标 → `#picks[data-n="5"]` 网格化）。

## R4 题库 40 题全表（kind/ans 域）

rows0-4 flower/blocksdown/balloonfly/thunder/singsong（face；**逐字节保留=flat0 锚面**）
rows5-9 fishfloat(sad)/dooropen(scared)/coinbank(happy)/sacktower(angry)/artshow(happy)（face 间接，5 新）
rows10-14 crayondrop(l1)/snatchtoy(l2)/swinggrab(l3)/castlekick(l4)/ruinlaugh(l5)（level，3 换新）
rows15-19 bookrip(angry+sad)/funfair(happy+scared)/friendmove(happy+sad)/bullyshout(angry+scared)/stageshow(happy+scared)（mix，5 新）
rows20-24 painting/shoutloud/towertop/grabtoy/lostmom（旧 ch2 直白 5 题迁入 dch1 扩展池）
rows25-29 rainpicnic(sad)/darkhole(scared)/grandma(happy)/nightnoise(scared)/kitewin(happy)（face 间接扩展，5 新）
rows30-34 stepfoot(l1)/queuejump(l2,新)/interrupt(l3)/modelcrush(l4,新)/tearbook(l5)（level 扩展）
rows35-39 puzzlelost(angry+sad)/gradfare(happy+sad)/bigkidpush(angry+scared)/legobroke(angry+sad)/racefirst(happy+scared)（mix 扩展，5 新）

族分布：face 20 题（**happy7/angry3/sad4/scared6 各≥3 ✓**，r49-fix m1 勘正：原写 5/5/5/5
系设计意图非实现实数，game-data 注释与逐题清点为 7/3/4/6——门禁下界「各≥3」成立，如需
补平衡属下轮内容决策非本轮缺陷）/level 10 题（各档=2 ✓）/mix 10 题（各组合≥2 ✓）。
字数口径：全 40 题 6-17 字（estMs 2670-6465）；22 新键 13-17 字。
退役场景：paintspill/longwait（旧 l1/l2 副词题——五档重排后无引用，SCENE_EL 已删；语音键仍在册，见 R6）。

## R5 窗数学（estMs=n×345+600 上界口径；演出常量零改动）

CELE_WIN=1932=right1632+300（精确）；WRONG_CHAIN_WIN=4626=wrong2088+150+hint2088+300（精确）；
PICK_MS=1000；BOUNCE_MS=1100≤2238（b37 R3/b38 R1 总窗口径 1100+140）；TUT_WATCH_WAIT=3540≥3240+300；
TUT_TURN_WAIT=2148≥1848+300；celebrate 2620+400=3020≥1932；教学 watch 分账 11652ms≤16000。
新键题面窗=estMs(13-17)+300=5385-6765（est 上界口径）。**段二实测复核**（真值源
r4789_clip_ms.json（r49-fix m7：实际位置 F:/Cache/temp/，主线注册机产物非项目内——项目树 glob 不可达），mutagen=浏览器 ±60ms 口径）：22 新键实测 3456-4488（max=etm_sc_friendmove）
全部低于 est 5085-6465；全 40 键逐键「实测 ≤ estMs(句长)」成立（最小裕量 486ms=etm_sc_thunder，
新键最小裕量 1629ms=etm_sc_racefirst）——est 窗全键有效，无需收窗。

## R6 新语音键清单（22 键——段二已注册收口，下表 est 窗为上界口径）

段一状态（已终结）：manifest 在册 28（etm 25=5 系统+20 旧情境句+core 3），22 键禁入
gen_clips.py/manifest（主线独占注册）+build.py 置零注册核查断言。文案=题面 say
（voice.play(q.sayKey, q.say) 同源），字数含标点，est 窗=n×345+600（上界口径；实测见 §R5）。

| 键 | 文案 | 字数 | estMs 上界 |
|---|---|---|---|
| etm_sc_fishfloat | 你的小金鱼不动了，浮在水面上 | 14 | 5430 |
| etm_sc_dooropen | 关了灯的房间，衣柜门吱呀开了 | 14 | 5430 |
| etm_sc_coinbank | 存钱罐里的钱，正好够买那个玩具 | 15 | 5775 |
| etm_sc_sacktower | 辛苦搭的高塔被人扫倒，他转身就走 | 16 | 6120 |
| etm_sc_artshow | 你的画被选去展览，大家都停下来看 | 16 | 6120 |
| etm_sc_bookrip | 绘本被撕坏了，你又气又难过 | 13 | 5085 |
| etm_sc_funfair | 明天去游乐园，你开心又有点怕下雨 | 16 | 6120 |
| etm_sc_friendmove | 好朋友要搬走了，你为他开心又舍不得 | 17 | 6465 |
| etm_sc_bullyshout | 有人抢你玩具还凶你，你又怕又生气 | 16 | 6120 |
| etm_sc_stageshow | 要上台表演啦，你开心又怕忘动作 | 15 | 5775 |
| etm_sc_rainpicnic | 期待好久的野餐，早上下起了大雨 | 15 | 5775 |
| etm_sc_darkhole | 球滚进黑黑的地下室，你不敢进去捡 | 16 | 6120 |
| etm_sc_grandma | 远方的奶奶坐了很久的车，来看你了 | 16 | 6120 |
| etm_sc_nightnoise | 半夜轰隆一声响，你从梦里惊醒了 | 15 | 5775 |
| etm_sc_kitewin | 风筝掉下来好多次，终于飞上了天 | 15 | 5775 |
| etm_sc_queuejump | 有人插队，一下站到了你的前面 | 14 | 5430 |
| etm_sc_modelcrush | 有人故意踩坏了你拼好的飞机 | 13 | 5085 |
| etm_sc_puzzlelost | 拼图被弄丢了，你又气又想哭 | 13 | 5085 |
| etm_sc_gradfare | 拿到毕业奖状很开心，又舍不得老师 | 16 | 6120 |
| etm_sc_bigkidpush | 有人抢了你的球还推人，你又怕又生气 | 17 | 6465 |
| etm_sc_legobroke | 乐高被踩坏了，你又生气又心疼 | 14 | 5430 |
| etm_sc_racefirst | 明天要比赛了，你开心又怕输 | 13 | 5085 |

**段二注册收口销账（2026-09-22）**：22 键主线已注册（manifest 5459→5517，ok=22 fail=0）；
2 孤儿键 etm_sc_paintspill/longwait 已清退（manifest 覆写自然掉出+mp3 已删）。clips 注入
28→**48**（etm 5 系统+etm_sc 40+core 3）。联动全销：build.py ETM_KEYS 40 键/N_CLIPS=48+
零注册断言删除（换孤儿键防复活反向断言）；verify ① keysAll.length===48+SPEC_DUR 40 键
实测表（删 2 孤儿行+补 22 实测行，真值源 r4789_clip_ms.json@F:/Cache/temp/——m7）；_selftest P1/P2 clips 断言
48/etm_ 45+P3b keyRegistered 翻转 True（播报实证）。注：段一预估 50 系「孤儿保留」口径，
实际主线选择清退=48。

## R7 六门禁数字（段二注册收口后终态，2026-09-22 实测；段一数字已被替代——
段一 md5 7bef8ffd/796065 chars/clips 28 见 git 历史）

| 门禁 | 结果 |
|---|---|
| build.py 双跑幂等 | md5 `15b1f3a7a08edf00dbf21ea64866dcff` ×2 一致；1429454 chars（48 clips 注入）；全断言绿（40 行/孤儿防复活反向断言/五档 CSS 7 锚/estMs 验算） |
| VERIFY 双视口 | 横 1280×800 `VERIFY PASS 12/12` 0 pageerror；竖 800×1180 `VERIFY PASS 12/12` 0 pageerror（dur 辨别器 ±60ms 首跑抓誊写错 1 例=modelcrush 应 3480 非 3768——磁盘 mp3/注入 base64/浏览器三方核后修正，全绿） |
| _selftest.py | SELFTEST PASS：P1 12/12+clips48+0err；P2 教学链 watch→__etmDemoR=picked→help 段**真实 DOM 点击** pick i=2→solo=true→flat0 autoSolve taps=5→存档 v1.0 levels['1-0'] stars=3→0err；P3a 水银 Δ=[20.4,20.4,20.4,19.4]px≥15+5 刻度；P3b mix 4 组合脸 data-anim 对账+温度计隐+playKey=etm_sc_bookrip **keyRegistered=true（段二注册播报实证）**→0err |
| pycheck 独立复验 | `PYCHECK 60/60 identical`（mulberry32 位级对拍 60 关全字段）+`ANCHOR flat0-4 baseline-identical True`+先验/分布/字数全绿（static/gen/cue/dist bad=[]，len 6-17） |
| gate_common39 etm | `3/3 PASS`：G1 verify 复跑 12/12 errs=[]；G2 demoR=picked auto={done,taps:6} stars=3 errs=[]；G3 clips n=48 miss=[] |
| 谱投影对账 | **段二复跑 vs 段一归档逐字段一致**（proj+full 双口径 identical=True）——注册零触 rnd 流实证；post vs baseline 承段一结论：13/60 逐字段相同/47/60 差异且 dch 全保留、无任何差异关共享完整 scene 序列 |

谱证据工具（随款归档）：`_r49_extract.py`（60 flats 提取，--full 全字段）/
`_r49_baseline.json`·`_r49_baseline_full.json`（改造前）/`_r49_post.json`·`_r49_post_full.json`
（改造后）/`_r49_pycheck.py`（独立复算）/`_r49_verify_run.py`（verify 快跑，argv 传视口）。

## R8 谱变化声明

- **rnd 流**：seed 公式与 flat<20 rotate 公式零改动——flat0-4 与 baseline 逐字节一致
  （教学锚保留）；flat≥20 的 dch 取数与 baseline 相同（47 差异关 dch 全保）。
- **flat0-4**：字节级保留（pycheck ANCHOR 对账 5 关×5 题全字段）。
- **flat5-19**：静态章内容换血（ch2 间接 5 新/ch3 五档重排 3 换/ch4 mix 5 新）——
  题面与答案域变、结构律不变（每题仍落本章程）。
- **flat≥20**：同 dch 但池成分重组（见 R1 勘正）→ 抽行与盘序部分变；47/60 投影有差异，
  13 关（flat0-4 锚+flat33/34/36/38/44/50/51/54 **确定性全同——r49-fix M1c 勘正：非「巧合
  相同/投影不可分」，全部 8 关为 dch1 生成关，rows20-24 系旧 rows5-9 逐字迁移保序，新池
  [0-4,20-24] 与旧池 [0-9] 索引逐位同景，同 rnd 流同消耗结构→必然字节级一致（含 scene）；
  审查 60/60 dch 序列逐位比对+flat33 直接字节比对实证**）。
- dch 分布：不变（同 seed 流）。

## R9 自登记风险项

1. **段一新键静默**（已销账——段二注册收口）：22 键已注册，播报恢复；实测窗复核全过
   （§R5：40/40 键实测 ≤ est 窗，最小裕量 486ms）。verify ④ play 锚注册后双向覆盖
   （_selftest P3b keyRegistered=true 播报实证）。
2. **孤儿键**（已销账——主线已清退）：etm_sc_paintspill/longwait manifest 覆写自然掉出
   +mp3 已删；build 计数 48+verify keysAll.length===48+build 孤儿防复活反向断言三重锁。
3. **mix 唯一性靠线索词先验+人工审计**：cue 表断言保证文本层唯一解；儿童实际能否
   分辨双拼脸两半情绪待试玩验证（视觉中线错位拼接=设计假设）。
4. **level 五档相邻分辨力**：水银 Δ 与签名线索类已过门禁；l3(一直/总是) vs l4(故意)
   的语义距离对 5-6 岁是否充分，待真实儿童验证（本风险承审计「强度三档是真内容」
   的延伸，属内容难度非结构缺陷）。**r49-fix m6 补登**：①l2 vs l4 边界同族风险——
   插队/抢走同为蓄意行为，儿童可按「他故意的」匹配 l4（文本层全枚举核实无跨档
   线索词歧义，语义歧义属同族，真机观察 l2 题误答 l4 率）；②sacktower「塔被人
   扫倒」损失语义可答 sad，靠 ch1 blocksdown→angry 模式锚定，边界紧（真机观察）。
5. **keepIdle 家族核对**（r23/r24/r46 家族缺陷）：本款 14s 方向级=saySceneAgain 重播
   情境句，天然不刷 lastAct（无 idle 锚污染）；30s 答案级刷新=终态语义（用户确实
   长停）——合规，核对表已入 game-main.js 头部注释。
