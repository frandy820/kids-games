# SPEC-R47-PLANT · 植树程序难度加深改造（r47，2026-09-22）

依据：AUDIT-67 #37 🟡 判定「实测 42.3s：**3×3 查表起步过易封顶 4×4，标尺恒在+每题一步
=低负荷**」；建议三维度（网格升 5×5-6×6/去标尺改记忆坐标/加相对指令与连种 3 棵多卡
程序）。校准：b37 段标称 6-7 岁计算思维（程序执行+坐标定位），宁难勿易——r15-r46 同口径。
本文件为 plant 的 r47 难度谱定稿；与 SPEC-BATCH37 §0.89/§2/v1 注释冲突处以本文件为准
（v1 记录留档不删，r33/r44 同款声明）。**SPEC-BATCH37 §2「渲染铁律：行列标尺恒可见」
由本文件显式废止为分章标尺策略（ch1-2 恒在/ch3-4 闪现，§R2）；「网格边长 3/3/4/4」
废止为 3/4/5/6；「每关 5 题=5 卡=5 树（每题一步）」的步语义保留（rel 题=两段指令一步
种树，题粒度不变）。**

## §R0 目标

保留玩法框架（花园网格+程序卡坐标定位种树、单 tap 单步判定、教学看→帮→独、星级=
retries 口径、救援双锚（14s 方向级/30s 答案级）、错反馈两级、存档 kidsgame_plant、
CH_LEN=5、静态 20 关、abs 坐标流 seed=mulberry32(flat*7919+737+qi*131) 逐题独立全部
不变），消除「查表低负荷」三源：①网格封顶 4×4=查表空间过小；②标尺恒在=行/列定位
纯查表；③每题一步单指令=零工作记忆。验收：agent 不自验（主线独立复验）；新语音键
禁自注册（§R6 键表+主线段二注册 TODO）；计数断言按**当前在册 25**（pl_ 22+core_ 3，
manifest 实查 2026-09-22：pl_ask/pl_hint/pl_right/pl_wrong/pl_tut_watch/pl_tut_turn
+pl_q_{1-4}_{1-4} 16 键），注册后 59 由主线改（TODO 注明）；测试静音双保险（每页
goto 前挂静音 init_script 1500ms ended 版 r28 定稿+种档 settings{sound:false,tts:false,
vol:0}）。

## §R1 设计总纲（审计三建议承接方式+逐条论证）

**δ1 网格升档 3/4/5/6（建议①照单采纳）**：
- `CH_N = {1:3, 2:4, 3:5, 4:6}`（v1 3/3/4/4 废止）。ch1 3×3（flat0-4 谱逐字节保留=
  锚面，§R5）/ch2 4×4/ch3 5×5/ch4 6×6；生成关 flat≥20 dch=静态 ch 档循环（不变）→
  flat20-24 n=3/25-29 n=4/30-34 n=5/35-39 n=6。
- 网格升档的直接负荷=扫描/计数距离变长（6×6 定位第 5 行须数 5 行，错一行=miss）；
  域扩大后均匀随机答案位的可猜性下降（1/9→1/36）。
- NUMCN 1-4 扩 1-6（五六，契约 L 封闭集全量 6 值）；程序卡句 clip 键域扩 pl_q_{r}_{c}
  全 6×6=36 键（在册 16+新 20）。
- **布局预算（写前验算，1280×800 实测盒模型：stage 648=800−hud48−dock104；v1 4×4
  scene 实测 542）**：6×6 直排需 scene≈740>stage ✗——**wide 紧凑布局**（n≥5 挂
  `#game.wide`）：hud 40+dock 98（padding 4/8）+stage padding 2+scene padding 8/8+
  标尺 28+格距 4 → scene=6+16+28+4+6×96+5×4=650 ≤ 800−40−98−4=658 ✓（余 8）；
  **程序卡改挂 dock 中央**（`#card-wrap` position:fixed bottom 居中，出流不占舞台
  高——非触达目标纯展示，兔子/重听按钮 x 两侧无重叠，1280 横/800 竖均核）；格
  ≥96×96 触达铁律不变（verify ① 双视口 × n=3/4/5/6 实测）。5×5 同 wide 方案余量
  ~108（r47-fix m3 勘正：原写 150 系把 6×6 的 8px 外推口径误抄到 5×5 档；5×5 实际
  网格占宽小于 6×6，余量为 108px 量级——verify ① simView 实测为准）。竖屏
  800×1180：stage≈1038，场景竖排余量充分。

**δ2 标尺闪现（建议②降级承接：恒在→开题闪现 1.2s）**：
- ch1-2 标尺恒在（v1 教学锚保留）；**ch3-4（dch≥3）：开题标尺可见，卡亮起
  RULER_FADE_MS=1200ms 后淡出**（opacity 0，CSS 过渡 .4s），进入无标尺作答。
- **降级理由（SPEC 论证）**：审计原文「去标尺改记忆坐标」的全裸版对 6-7 岁不可达
  （无任何数数基准的 6×6 行定位错误率>50%=受挫域）；闪现版保留「先见基准再记忆」
  的脚手架坡度——听句+看标尺编码（约 2.1s：ask 2172 内标尺可见+卡亮后 1200ms），
  淡出后凭工作记忆/边缘计数作答。**错反馈/兔子提示/救援方向级=标尺重闪+高亮正确
  行列**（litRulers 兼容扩展：先解除淡出，高亮窗口（700+700+900）结束再淡出）——
  错误即再教学，v1 方向级反馈语义（不亮格子本体）不变。
- rel 题（δ3）不消费标尺（参照=星星）——ch3-4 rel 题标尺同样闪现淡出（章规则统一，
  星星恒在场承载参照）。

**δ3 相对指令题 rel（建议③承接：两段指令程序）**：
- **题型**：程序卡=「从星星出发，向X格，向Y格」两段移动指令；星星起点徽章（SVG
  金星，`data-star="1"` DOM 锚）挂在参照格；孩子解析方向×步数复合位移→点目标格
  种树。**判定粒度不变：1 题=1 tap=1 棵树**（step 0-4/miss/星级/教学链全兼容）。
- **封闭域（写前验算）**：方向 ∈{右,下,左,上}（DIRCN r/d/l/u）×步数 ∈[1,3]
  （STEPCN 一/两/三）；约束：段间中途位置与终点均在格内（每段单调，段末在格内⇒
  中途在格内）、净位移≠0（禁环形回起点）、star ∉ used（星星不上树/不复用已种格）、
  终点 ∉ used（关内 5 格互异口径不变）。n≥3 时任一格至少 2 邻向可行（feasible 集
  非空恒成立，3×3 以上无死锁）——验算 ✓。
- **负荷论证**：①两段指令=工作记忆双负载（须同时保持方向+步数对）；②方向镜像
  （左/右、上/下）=真错误源；③位移合成（先右 2 再下 1≠直接斜跳——中途格是视觉
  干扰）；④星星参照系≠行列标尺参照系（参照转换）。这四源均为认知负荷非运气题。
- **「连种 3 棵多卡程序」granularity 裁决（不采纳原形，论证）**：多卡连种（1 题=
  2-3 张卡连点 2-3 棵）改变题粒度=破坏 step=全关题号 0-4（b33 坑①）/每题 miss 口径/
  教学链/verify 驱动全家族契约，且与「每关 5 题 5 卡 5 树」的 v1 定版冲突（§0.89
  主线裁决原文）。程序执行负荷由**两段指令链**承载（每 rel 题=一个 2 指令程序），
  连种叙事由关内花园持续成形（5 题连种 5 棵=关级程序）承载。登记 backup（§R12.2）。
- **章谱混排**：dch1 全 abs（锚面）/dch2、dch3 rel@[1,3]（2 题/关）/dch4 rel@[0,2,4]
  （3 题/关）。静态 20 关 rel 计 35/100 题；生成关同律（dch 循环）35/100。

## §R2 章谱（CH_LEN=5、静态 20 关=4 章×5 关不变；flat 区间按 CH_LEN 真值=5）

| 章 | flat | 名称 | 网格 | 标尺 | 构成律（qi0..qi4） |
|----|------|------|------|------|--------------------|
| ch1 | 0-4 | 种小树 | 3×3 | 恒在 | 5×abs（**flat0-4 谱与 v1 逐字节一致**） |
| ch2 | 5-9 | 小花园 | 4×4 | 恒在 | [abs, rel, abs, rel, abs] |
| ch3 | 10-14 | 大花园 | 5×5 | 闪现 1.2s | [abs, rel, abs, rel, abs] |
| ch4 | 15-19 | 植树大挑战 | 6×6 | 闪现 1.2s | [rel, abs, rel, abs, rel] |
| 生成 | ≥20 | —— | dch 循环 | dch≥3 闪现 | dch=diffOfCh 静态（不变）→20-24/25-29/30-34/35-39 同 ch1-4 律 |

- CHAPTERS/GEN_HINTS 文案全换（§R4 封闭表——hint[i]↔CHAPTERS[i+1] 家族 F 禁右移）。
- dch 无 RNG（域承诺型不变）；标尺策略=纯 dch 派生（dch≥3 闪现）。

## §R3 生成规则（rnd 消耗序列定版——pycheck 位级复刻依据）

```
genLevel(flat):
  ch = flat//5+1; dch = (ch-1)%4+1（静态，无 RNG——不变）; lv = flat%5
  n = CH_N[dch]                          // {1:3,2:4,3:5,4:6}
  used = []                              // 关内已用目标格（扁平）
  for qi in 0..4:
    if qi ∈ REL_PLAN[dch]: q = relQuiz(flat, qi, n, used)   // REL_PLAN={1:[],2:[1,3],3:[1,3],4:[0,2,4]}
    else:                   q = absQuiz(flat, qi, n, used)  // v1 原样
    used.push(target(q))

absQuiz（v1 原样不变）:
  rnd = mulberry32(flat*7919+737+qi*131)          // abs 流常量 737（不变）
  do { row=ri(rnd,1,n); col=ri(rnd,1,n); idx=(row-1)*n+(col-1) } while idx∈used
  → {kind:'plant', mode:'abs', n, row, col, star:null, moves:null, _miss:0, _answered:false}

relQuiz（r47 新增；rel 流常量 9973）:
  rnd = mulberry32(flat*7919+9973+qi*131)
  loop:
    sr=ri(rnd,1,n); sc=ri(rnd,1,n); starIdx=(sr-1)*n+(sc-1)
    if starIdx∈used: continue                       // 星星不上树
    f1 = feas(sr,sc,n)                              // DIRS=['r','d','l','u'] 序过滤 margin≥1
    if f1=[]: continue                              // n≥3 恒非空（验算 §R1δ3）
    d1 = f1[floor(rnd*len(f1))]; s1 = ri(rnd,1,min(3,margin(d1)))
    (r1,c1) = (sr,sc)+DRC[d1]*s1                    // DRC={r:[0,1],d:[1,0],l:[0,-1],u:[-1,0]}
    f2 = feas(r1,c1,n); if f2=[]: continue
    d2 = f2[floor(rnd*len(f2))]; s2 = ri(rnd,1,min(3,margin(r1,c1,d2)))
    (tr,tc) = (r1,c1)+DRC[d2]*s2; tgtIdx=(tr-1)*n+(tc-1)
    if tgtIdx==starIdx: continue                    // 净零禁
    if tgtIdx∈used: continue                        // 关内互异
    break
  → {kind:'plant', mode:'rel', n, row:tr, col:tc,
     star:{row:sr,col:sc}, moves:[[d1,s1],[d2,s2]], _miss:0, _answered:false}
```

- abs/rel 双流分流（737/9973）——ch1 全 abs ⇒ flat0-4 谱逐字节不变（rnd 流零触碰）。
- 重抽/循环全部同流（确定性）；rel loop 无上限（与 v1 abs 撞格 do-while 同范式）。
- used 只收目标格（星星不入 used——星星格可被后续题作目标，徽章届时让位树苗）。

## §R4 封闭表（verify ⑥/⑨/⑮ 与 pycheck 独立对账依据；表外不出题不出句）

```
CH_N       = {1:3, 2:4, 3:5, 4:6}
REL_PLAN   = {1:[], 2:[1,3], 3:[1,3], 4:[0,2,4]}
NUMCN      = {1:'一',2:'二',3:'三',4:'四',5:'五',6:'六'}     // 契约 L 全量 6 值（行列骨架句）
DIRCN      = {r:'右', d:'下', l:'左', u:'上'}
STEPCN     = {1:'一', 2:'两', 3:'三'}                        // 步数用「两」非「二」（口语）
DIRS       = ['r','d','l','u']                               // feasible 过滤序（rnd 索引确定性锚）
DRC        = {r:[0,1], d:[1,0], l:[0,-1], u:[-1,0]}          // (dr,dc)
mvText(m)  = '向'+DIRCN[m[0]]+STEPCN[m[1]]+'格'              // 4 字恒定（向右两格）
cardText(q)= abs: '第'+NUMCN[row]+'行第'+NUMCN[col]+'列'      // 6 字恒定（不变）
             rel: '从星星出发，'+mvText(m0)+'，'+mvText(m1)   // 15 字恒定
cardClip(q)= 'pl_q_'+row+'_'+col                             // abs 卡句 clip（T46 机制不变）
relClips(q)= ['pl_rel_from', 'pl_mv_'+d1+s1, 'pl_mv_'+d2+s2] // rel 卡句=queue 拼 3 clip
CHAPTERS   = {1:{name:'种小树',    hint:'花园变大啦，四行四列'},
              2:{name:'小花园',    hint:'花园更大啦，五行五列'},
              3:{name:'大花园',    hint:'大花园大挑战，六行六列'},
              4:{name:'植树大挑战',hint:'新一轮植树开始'}}
GEN_HINTS  = ['小花园里，再种五棵小树',   // dch1 n=3
              '花园变大啦，四行四列',     // dch2 n=4
              '大花园里，再种五棵小树',   // dch3 n=5
              '六行六列大花园，种满小树']  // dch4 n=6
```

## §R5 锚面（flat0 q0 教学锚+flat0-4 全章谱）

- **语义投影锚**：投影器输出 [mode,row,col,n,star,moves]——flat0-4 每题五元组
  (row,col,n,star,moves) 与 baseline 逐字节一致（star/moves 恒 null）；`mode` 为 r47
  新增字段（baseline 缺省投影 null vs post 'abs'）——字段面必变不属锚面（r44 §R2 ③
  同款声明）。**flat0 q0=3×3 (2,2) 中心格**，教学链三段（watch 演示 (2,2)→turn (3,1)）
  零改动；教学迷你关 quiz 补 mode:'abs' 字段（行为零变化）。
- **谱变化声明**：abs 流（737）零触碰；rel 新流（9973）只在 rel 题消耗；ch1（flat0-4）
  全 abs ⇒ 谱逐字节保留；**ch2-19+生成关谱全刷新**（n 域变化+rel 混入——设计内，
  非锚破坏）。存档兼容=零迁移（键/CH_LEN/星级/进度键 c-l 格式不变，旧档直接续玩，
  r44 §R12.6 同款）。

## §R6 新语音键清单（34 键，games=['plant']——**段一只设计不注册**；主线段二注册 TODO）

前缀 pl_ 已核 manifest 无下列键名（2026-09-22 实查在册 22 键全列比对）；estMs(n)=
n×345+600（全域全字符口径）；注册后主线实测复核 TODO（r23 P2-1 红线：est 值禁当实测值）：

| key | 文案 | 字数 | estMs | 消费点 |
|-----|------|------|-------|--------|
| pl_rel_from | 从星星出发 | 5 | 2325 | rel 卡句链头（开题/重听/救援重读） |
| pl_rel_hint | 从星星开始，数着走 | 9 | 3705 | rel 错链第二段+兔子/空白提示（方向级） |
| pl_mv_r1 / r2 / r3 | 向右一格/两格/三格 | 4 | 1980 | rel 链段 |
| pl_mv_d1 / d2 / d3 | 向下一格/两格/三格 | 4 | 1980 | 同上 |
| pl_mv_l1 / l2 / l3 | 向左一格/两格/三格 | 4 | 1980 | 同上 |
| pl_mv_u1 / u2 / u3 | 向上一格/两格/三格 | 4 | 1980 | 同上 |
| pl_q_1_5 … pl_q_4_6（8 键） | 第X行第Y列（含五/六） | 6 | 2670 | abs 5×5/6×6 卡句（T46 同机制） |
| pl_q_5_1 … pl_q_5_6（6 键） | 同上 | 6 | 2670 | 同上 |
| pl_q_6_1 … pl_q_6_6（6 键） | 同上 | 6 | 2670 | 同上 |

- **段一在册断言**：build.py n_clips==25（pl_ 22+core_3）+ `DESIGN_KEYS 全部 ∉ clips`
  （34 键在册空集断言=段一未注册状态证明）；verify ① clips 表仍 25 键（SPEC_PL_Q
  16 在册）。段二联动 TODO：manifest plant 22→56（+core_3=59 注入）、build n_clips
  25→59+PL_Q_KEYS 扩 20、verify SPEC_PL_Q 扩 20+SPEC_REL_KEYS 实测实长、CARD_WIN_REL/
  WRONG_CHAIN_REL 实测复核（est 全字符口径通常高于实测——窗预期不调，r44 §R8 先例）、
  gate_common37 G3 传参 25→59。
- **静默期披露（r37/r44 先例）**：未注册期 rel 卡句链/pl_rel_hint/pl_q_5_*/6_* 播放
  走 core voice.play/queue 缺 clip 回退 speak=静默丢弃（core.js:104 缺 clip 且无文本=
  放弃整句）；卡文案视觉承载不缺信息；注册后自动接链。CARD_WIN_REL=6900 宁等勿叠
  （r24 口径——注册前每 rel 题静默多等 ~2.6s，verify SPEED=0.12 影响 ~0.31s）。
- **段二注册销账（2026-09-22）**：34 键已由主线注册（manifest 5459→5517，ok=34
  fail=0，mp3 全在）——上文静默期披露随之终结（rel 链视觉+听觉双承载）。联动收口：
  build n_clips 25→**59**（PL_Q_KEYS 扩 6×6=36+PL_REL_MV_KEYS 14 逐键正断言）+
  「未注册反断言」反转为**已注册正断言**（34 键 ∈ clips——防漏注册）；verify
  SPEC_PL_Q 扩 20 实测键+**SPEC_REL_MV 14 键实测表**新增+① clips 59（pl 全域 50 键
  duration ±60ms 逐验）+⑨ designOk 反转为全在册；_selftest clips 59+34 设计键全在册；
  gate_common37 G3 传参 59（§R12.6 docstring 注释债同步销账）。实测实长真值源
  `F:/Cache/temp/r4789_clip_ms.json`（mutagen 口径，pl_ 全域 50 键）。TODO 全销。

## §R7 时序（est 上界口径全表；verify SPEED=0.12 提速）

| 窗 | 值 | 算式/依据 |
|----|-----|-----------|
| ASK_WIN（abs/rel 同） | 2172 | pl_ask 1872+300（不变） |
| CARD_WIN（abs 全档） | 3315 | ≥ est 第六行第六列 6 字 2670+300=2970（6 字恒定——1-6 域同字数；窗不动零 pacing 回归） |
| **CARD_WIN_REL（rel 卡句链）** | **6900** | ≥ est 链 pl_rel_from 2325+150+pl_mv 1980+150+pl_mv 1980=6585，+300=6885（宁等勿叠）；**实测 1920+150+1920+150+1920+300=6360 ≤ 6900 余 540ms 不调窗（段二）** |
| 判对演出窗 | 1100+1300=2400 | ≥ pl_right 1944+300=2244（不变） |
| 错链豁免窗（abs） | 5082 | pl_wrong 2064+150+pl_hint 2568+300（不变，真时钟契约 I）；**段二复核：三键全在册实测、精确等式不变** |
| **错链豁免窗（rel）WRONG_CHAIN_REL** | **6219** | pl_wrong 2064+150+pl_rel_hint est 3705+300=6219（est 上界=设计口径）；**实测 2064+150+2928+300=5442 ≤ 6219 余 777ms 不调窗（段二）** |
| **RULER_FADE_MS（dch≥3 标尺淡出）** | **1200** | 卡亮起后 1.2s 淡出（听句+看标尺编码窗≈ask 2172+1200=3.4s 后无标尺作答——§R1δ2 坡度论证；**r47-fix M2**：修复前实现 setTimeout 注册点在卡亮（ask 窗 await 后）但延迟仍带 (ASK_WIN+RULER_FADE_MS) 偏移=ASK_WIN 双重计入，实际淡出=卡亮后 3372ms 且标尺整个读卡窗可见，δ2 记忆坐标负荷实质未生效；修复=延迟只算 RULER_FADE_MS*SPEED 段+verify ④ 时刻性断言（卡亮后 20ms 可见+144+60ms 已 off）+build 禁式锚） |
| 标尺高亮节奏 | 700+700+900 | litRulers（不变；ch3-4 高亮窗口内标尺重闪，窗末恢复淡出） |
| GARDEN_WIN / 教学窗 | 2400 / 全不变 | 教学 watch 分账 12379 ≤16000（build.py 断言原文保留） |

- 关名义时长模型：abs 开题 2172+3315=5487；rel 开题 2172+6900=9072。ch4 关=2×5487+
  3×9072+5×2400+2400≈48.6s 名义（v1 实测 42.3s 含思考——r47 含儿童解析两段指令+
  无标尺计数，实测预期 70-100s）。
- **段二实测双口径注记（2026-09-22，真值源 r4789_clip_ms.json mutagen 口径）**：
  est(n)=n×345+600 保留为**设计口径**（上界，锁窗依据），实测实长为**运行真值**——
  pl_rel_from 1920 / pl_rel_hint 2928 / pl_mv 12 键 1776-1920（worst 1920）/
  pl_q 36 键 1944-2184（worst 2184=在册旧键 pl_q_4_4；新 20 键 max 2160）。窗复核
  三窗全部「实测≤窗」：CARD_WIN_REL 6900≥6360（余 540）/WRONG_CHAIN_REL 6219≥5442
  （余 777）/abs 错链 5082=实测精确等式（2064+150+2568+300 全在册旧键）。三窗均
  不调（宁等勿叠 r24 口径）；build/verify 断言层 est+实测双轨并存（est 锁窗值=
  常量精确断言，实测为 ≥ 罩住断言）。

## §R8 判定/钩子/渲染契约

- **engTapCell 语义扩展**：rel 题点星星格 → `false`（星星摇 starbeat+拒绝，不计 miss
  ——家族 D 探索不罚变体：星星是 salient 参照物，儿童首点星星是自然探索）；其余全
  不变（对 'planted'/'done'、错 'wrong'+miss、已种格 false、非法/已答 null）。
- **PL.quiz getter**：+`mode('abs'|'rel')`、`star({row,col}|null)`、`moves([[d,s]×2]|
  null)`（拷贝）；row/col 恒=本题目标格（abs=卡坐标/rel=位移终点——verify specTgt
  口径复用）；card=cardText(q)（rel 15 字句）；step/miss/planted 不变。
- **渲染**：n≥5 挂 `#game.wide`（紧凑布局+程序卡 fixed 挂 dock 中央）；rel 题 star
  徽章（`data-star="1"`+`.starbadge` SVG，金五角星）挂参照格，题移除（presentQuiz
  setStar 生命周期：开题挂/答对清/换关重建）；ch3-4 标尺 `#garden.rulers-off`（开题
  淡出——litRulers 窗内解除）；aria：星星格「第X行第Y列的格子，星星起点」。
- **救援/重听（idle 锚纪律 r46 M1 复核）**：14s 方向级=重读卡（rel 加星星 starbeat
  pulse）——走 reReadCard(false) 不刷 lastAct ✓；30s 答案级=目标格 breathe+重读
  （reReadCard(false)）后刷 lastAct（救援节流锚不动）；用户重听/开题/种对刷 lastAct
  ✓（v1 语义全承）。兔子提示：abs=pl_hint+litRulers / rel=pl_rel_hint+starPulse。
- **演出窗并发重入（r46 S1 复核）**：presentQuiz token++ 点（startLevel/showRun/
  uiTapCell done）同步回收在途旗标——star 徽章/rulers-off 淡出定时全部 token+run
  双守卫（abort 分支不留脏 DOM 类）；litRulers 尾部恢复淡出以 cur===run 守卫。

## §R9 verify（12 单元）/ _selftest / pycheck 改造清单

- verify：①结构（simView flats [0,5,10,15]×双视口——n=3/4/5/6 全档；clips 25 在册
  +duration ±60ms）②教学（不变）③drive flat0-19（SPEC_N 新表+abs/rel 双流独立复算
  specCells/specRel+关内互异+引擎直驱——k=1 已种格拒绝改用 L3.quizzes[k-1] 目标
  （mode 无关））④frameM（flats [0,10,15,20]：+mode/star DOM 锚+rel 卡 15 字+dch≥3
  rulers-off 在场断言）⑤错路径（flat0 abs 原链+[新 ⑤b rel：flat5 q1 错链
  [pl_wrong,pl_rel_hint]+WRONG_CHAIN_REL 窗+星星格 false 不计 miss+miss≥2 目标
  breathe]）⑥先验 20 关全量（abs/rel 域+rel 不变量组：star∉used/净≠0/中途在格/
  moves 域+分布聚合）⑦星级（不变）⑧gen flat20-39（n 块恒 3/4/5/6 各 5 关+rel 计数
  dch1=0/dch2,3=2/dch4=3+**分布断言：方向 4 值/步数 3 值/行列表头覆盖——下界从均匀
  期望独立推导（§R11 实测谱对账）**）⑨契约源码（新字面：CH_N/REL_PLAN/NUMCN 6 值/
  WRONG_CHAIN_REL 6219 算式/CARD_WIN_REL 6900 算式/RULER_FADE_MS/playCard 分支/
  relClips/星星拒绝字面+旧 A-O 全保留）⑩确认链（[pl_right] 不变+rel 开题链
  __lastQueue===relClips(q)+新窗算式）⑪save（不变）⑫realPath（不变）。
- _selftest.py 重写（batch6/words 模板）：MUTE_INIT（1500ms ended function 版）每
  context 挂+种档 settings{sound:false,tts:false,vol:0}；P1 verify 全绿；P2 fresh 档
  教学链真实走完（__plDemoR='planted'→turn (3,1)→flat0 autoSolve 3★→写档）+clips
  25（pl_22+core_3——修 T46 后未同步的 9 旧断言）；P3 rel 专项（预置档 PL.start(5)→
  q1 rel 独立复算 star/moves/目标→错点 miss+错链键→星星 false→对选 planted）+双视口
  800×1180 flat15 wide 布局 ox=0+格 ≥96；全程 0 pageerror+离线。
- pycheck（_r47_pycheck.py）：§R3 生成律 Python 位级复刻（mulberry32 Math.imul 截断
  乘/全程 &0xFFFFFFFF/feasible 索引序），40 关×5 题逐字段（mode/row/col/n/star/
  moves/_miss/_answered+ch/dch/lv）对拍 _r47_post_full.json；先验自证（REL_PLAN 计数/
  flat0-4 与 baseline 逐字节锚/rel 不变量/分布计数下界）。

## §R10 六门禁（数字回填段一实测，2026-09-22 终版 build）

| 门禁 | 结果 |
|------|------|
| ① build.py 双跑幂等 | PASS：md5 `822467d6b7d675bc830eedd37502d887` 两跑一致（607022 chars） |
| ② VERIFY 双视口 | PASS：1280×800 `VERIFY PASS 12/12` + 800×1180 `VERIFY PASS 12/12`，各 0 pageerror |
| ③ _selftest.py | PASS：36/36（verify 12 单元+ghost 教学链+autoSolve 3★写档+clips 25+34 设计键
  在册空集+flat5 rel 全链 Python 对拍+800×1180 flat15 wide 36 格 ≥96 ox=0 rulers-off
  star 徽章+截图 stdev 27.0+离线+0 pageerror） |
| ④ pycheck | PASS：PRIOR 0 fails（rel 70/200+不变量+分布下界）+COMPARE 40 关 200 题
  mode/row/col/star/moves 逐字段 0 fails（vs _r47_post_full.json 终版提取） |
| ⑤ gate_common37.py plant PL（clips_n=25 在册） | PASS 3/3（G1 verify 复跑/G2 demoR=planted
  tut=help auto taps=6 stars=3/G3 n=25 miss=[]） |
| ⑥ 谱投影 post json+分布断言 | PASS：ch1 flat0-4 五元组 (row,col,n,star,moves) 与 baseline
  0 fails 逐字节保留；n tally {3:10,4:10,5:10,6:10}（40 关）；rel 70；分布实测
  dir {r:31,d:34,l:42,u:33}（Σ140 段，下界 8×4）step {1:69,2:40,3:31}（下界 8×3）
  rowN(n5) 6-17 / rowN(n6) 6-11（下界 2×5/6 值）——全过 |

## §R10b 段二重门禁（注册后联动收口，2026-09-22 终版 build）

| 门禁 | 结果 |
|------|------|
| ① build.py 双跑幂等 | PASS：md5 `cd8fb9c4b510e4de912aa7323a71880b` 两跑一致（1160053 chars；clips 注入 59 条=pl 56+core 3） |
| ② VERIFY 双视口 | PASS：1280×800 `VERIFY PASS 12/12` + 800×1180 `VERIFY PASS 12/12`，各 0 pageerror |
| ③ _selftest.py | PASS：36/36（verify 12 单元+ghost 教学链+autoSolve 3★ 写档+**clips 59+34 设计键全在册**+flat5 rel 全链（注册态：verify 页 queue stub 照记 __lastQueue/真实页 tts:false 关播——两态时序均零变化）+800×1180 flat15 wide 36 格 ≥96 ox=0 rulers-off 星星徽章+截图 stdev 27.0+离线+0 pageerror） |
| ④ pycheck | PASS：PRIOR 0 fails（rel 70/200+不变量+分布下界，分布与段一逐值一致） |
| ⑤ gate_common37.py plant PL（clips_n=59） | PASS 3/3（G1 verify 复跑 12/12/G2 demoR=planted tut=help auto taps=6 stars=3/G3 n=59 miss=[]；docstring 注释债同步销账 §R12.6） |
| ⑥ 谱投影复跑 | PASS：post/post-full 与段一**逐字节一致**（md5 bde96b140692 / 51bb35fce9b8）——注册零触 rnd 流（abs 737/rel 9973 双流未动）实证 |

## §R11 谱投影 baseline-post（r27 m4：谱证据工具随款归档 _src/）

- 工具：`_r47_post.py <out> [--full]`（语义投影 [mode,row,col,n,star,moves]；--full
  全字段供 pycheck）。
- baseline（改造前 2026-09-22 提取，产物 md5 62e84d70）：`_r47_baseline.json`/
  `_r47_baseline_full.json`——n tally {3:20, 4:20}；flat0 谱 [(2,2),(1,3),(3,2),
  (1,2),(3,1)]（q0=(2,2) 中心格=教学锚）。
- post（改造后 2026-09-22 终版 build 提取）：`_r47_post.json`/`_r47_post_full.json`——
  n tally {3:10,4:10,5:10,6:10}（静态 20+生成 20）；rel 70/200（ch1/gen-dch1 全 abs）；
  flat0-4 五元组与 baseline 逐字节一致（abs 流 737 零触碰——锚面）；ch2+ 静态关与生成关
  谱刷新（网格升档 n 域扩+rel 混排，声明性预期）；分布实测 dir {r:31,d:34,l:42,u:33}/
  step {1:69,2:40,3:31}/rowN(n5) 6-17/rowN(n6) 6-11（下界 8/8/2——§R1δ3 均匀期望推导）。
- 对拍链：post-full.json ↔ pycheck（Python 复刻）↔ verify ③⑥⑧页内审计——三方互证。

## §R12 披露与登记

1. **未注册 34 键静默期**（§R6）：rel 卡句链/pl_rel_hint/pl_q_5_*/6_* 无声，视觉卡
   文案承载；注册后自动接链（r37/r44 先例）；不阻塞段一交付。
2. **「连种 3 棵多卡程序」原形不采纳**（§R1δ3 granularity 论证）；负荷由两段指令链
   承载；backup=若审查要求真连种，候选=题内子步（tap 序列判序），属大改破坏题粒度
   家族契约。
3. **6×6 布局紧凑档**：#game.wide（hud 40/dock 98/scene padding 8/ruler 28/gap 4/
   card fixed dock 中央）——1280×800 余 8px/800×1180 余 ~390px；<800px 高的横窗
   （如 1280×720）wide 档会溢出（v1 4×4 在 720 也仅余 14px——家族目标平板/桌面
   1280×800+，同 v1 残余风险登记）；真机观察项：6×6 若市场反馈小屏多再议 5×5 封顶。
4. **rel 徽章与树共存边界**：star∉used 生成期保证星星永不上树；star 格可被后续题作
  目标。**r47-fix M1 勘正**：原写「树苗覆盖徽章——presentQuiz 生命周期管理」与实现
  相反——实现=setStar 清理分支拆除徽章 span+还原 aria（星格让位树苗时徽章即从 DOM
  移除，非视觉覆盖）；修复前徽章 span 从不拆除（残留 4/20 静态关，flat5 q1 星格
  ==q3 目标格=视觉泄答实锤），门禁只查 .star 类为盲区，已补 verify ④ badge 双面
  断言+build 静态锚+§R13 修复记录。
5. **分布断言口径**：确定性谱（mulberry32 固定 seed）——下界从均匀期望独立推导+
   post.json 实测计数对账双防线（r39-bis ①/r44 §R2 ②同款）。
6. **gate_common37 docstring plant 计数**：T46 后曾滞留 9（注释债）；r47 段二更新为
   59 并销账（docstring+传参，2026-09-22，§R10b ⑤）。
7. **_selftest.py clips 断言**：T46 后曾滞留 9；r47 段一改 25、段二随注册改 59
   （键级：34 设计键全在册正断言）。

## §R13 实施记录（append-only）

- 2026-09-22 段一实施：SPEC 定稿（本文件）+baseline 谱提取+五件套改造+工具三件
  （_r47_post/_r47_pycheck/_selftest 重写）+rebuild+六门禁自测（§R10 回填）；新键 34
  只设计不注册（§R6），主线段二注册后联动 §R6 尾注+窗常量复核 TODO。
- 2026-09-22 自测期修正三笔（终版全绿前）：① game-verify.js 块注释内 `pl_q_5_*/`
  的 `*/` 提前闭合注释=script[3] 整块语法死（Numeric separators SyntaxError）——
  改写注释措辞；② ⑤ B 段 `currentLevel.step===1` 断言在 ⑤b 推进他关后才估值（假
  失败）——改即时捕获 stepB；③ simView wide 档程序卡（position:fixed 出流）水平
  判界对象=真实视口宽 非 #game 仿真宽（假失败；真 800×1180 实测 566≤800 通过）。
  _selftest ghost 等待窗 4s→10s（turn 开题 ask 2172+卡句 3315+600 后 ghost 才现）。
- 2026-09-22 段二联动收口（主线注册 34 键 manifest 5517 后）：build 59 断言+
  DESIGN_KEYS 反断言反转+est→实测回填（真值源 r4789_clip_ms.json）/verify
  SPEC_PL_Q 36 键+SPEC_REL_MV 14 键+①⑨⑩ est/实测双口径/game-data 注释销账/
  _selftest 59/gate_common37 docstring 59；三窗实测复核全过不调窗（§R7 注记）；
  §R10b 六门禁全绿（终版 md5 cd8fb9c4b510e4de912aa7323a71880b）。段二自测期修正
  两笔（终版全绿前，均为 verify 断言层假失败、非游戏缺陷）：① ① duration 辨别器
  specDurOf 只查 SPEC_DUR/SPEC_PL_Q 两表——plKeys 扩 14 rel/mv 键后查值 undefined
  →NaN≤60 恒 false——扩为三表合并查值；② ⑩ specMvWorst 对整个 SPEC_REL_MV 表取
  max——pl_rel_hint 2928 混入 mv worst（应 1920）致实测链断言 6900<7376 假失败
  ——filter `pl_mv_` 前缀后取 max（插桩子条件真值定位，修正后插桩移除）。
- 2026-09-22 审查修复轮（REPORT-REVIEW-r47.md，fatal0/major2/minor5→修复闭环）：
  **M1 星星徽章 span 从不拆除**——setStar 清理只删 .star 类+dataset.star，.starbadge
  span 留 DOM 且 CSS 无条件可见；主线 node 复算坐实静态 20 关 4 关残留泄答场景
  （flat5 q1 星格(4,1)==q3 目标格/flat6/flat15/flat19），危害=残留假星误导+点假星走
  wrong 计 miss（星星拒绝分支只认当前题 starIdx——不罚→罚语义反转）+残留星标后题
  答案格=视觉泄答。修复=setStar 清理分支 b.remove() 徽章+aria 尾巴 slice(0,-5)
  还原 renderGrid 原始标签；防回归=verify ④ abs 关全场无 badge+rel 对选后 badge
  拆除双面断言+build 拆除字面锚+_selftest star_gone 扩查 span。**M2 标尺淡出
  ASK_WIN 双重计入**——setTimeout 注册在 await wait(ASK_WIN*SPEED) 之后（=卡亮
  时刻）但延迟仍带 (ASK_WIN+RULER_FADE_MS)*SPEED 偏移→实际淡出=卡亮后 3372ms 非
  声明 1200ms，标尺整个读卡窗可见，δ2 记忆坐标负荷实质未生效；修复=延迟改
  RULER_FADE_MS*SPEED+verify ④ 时刻性断言（卡亮轮询锚→20ms early 可见→
  RULER_FADE_MS*SPEED+60ms faded 已 off；修复前淡出点 405ms>采样 264ms 必红）+
  build 双静态锚（延迟字面在场+禁式不在场，r37 修复轮先例）。**观察冲突裁决**：
  试玩 C 段「卡亮+1.2s 加 rulers-off」与静态推导 3372ms 冲突 2172ms=恰一倍
  ASK_WIN——修复钉死 RULER_FADE_MS*SPEED 后页内时间线复测裁决（修复后行为=
  SPEC 声明卡亮后 1200ms，无论修复前何值）。minor 顺手：m1 litRulers 尾部加
  step 守卫（同关换题不动新题标尺态）/m3 §R1δ1 余量 150→108 勘正/m4 _selftest
  注释归因（星星拒绝分支先于豁免窗 guard）/§R12.4+§R7 表勘正；m2 分布断言
  下界判别力（观测远高于下界=非抄观测实证，不修）/m5 rel 空白提示 starPulse
  （登记不修）。md5 滚动见 §R10b。
