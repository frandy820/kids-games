# SPEC-R44-POSITION · 方位词图阵难度加深改造（r44，2026-09-22）

依据：AUDIT-67 段序 18 🟡 判定「估 35-45s：**ch1-2 仅前后上下=4-5 岁起步；读图指位非
方位推理**」；建议三维度（ch1 起 6 方位含左右/双参照物复合/ch4 视角转换）。校准：b33
段标称 6-7 岁一年级《位置》对齐，宁难勿易——r15-r43 同口径。本文件为 position 的 r44
难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH33 §0.80/§2 的 v1 难度面冲突处以本文件
为准（v1 记录留档不删，r33/r34 同款声明）。**SPEC-BATCH33 §0.80「左右=ch1-2 不出现
ch3 引入」「ch1-2 域=前后上下 4 格（左右格隐藏不渲染）」两条由本文件显式废止（delta
明令 ch1 起 6 方位）；「物参照系留 b34+」条款由本文件局部废止（dual 题引入房子参照的
换算，树参照+孩子视角仍为主线）。**

## §R0 目标（账本 §0 摘录）

保留玩法框架（树居中场景+六方位格点选、单 tap 单步判定、教学看→帮→独、星级=retries
口径、救援双锚、存档 kidsgame_position、CH_LEN=5、静态 20 关、seed=mulberry32(flat*7919+977)
确定性通道全部不变），消除「认知空心」（ch1-2 十关 4 域读图指位=4-5 岁级；全款无方位
推理题）——改造后 ch1 即 6 方位含左右巩固，ch2 起反向指令，ch3 双参照物复合定位（兔
子隐藏纯听觉推理），ch4 兔子朝向态视角转换（绝对→相对方位映射，Level-2 视角采择）。
验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R7 键表+主线段二注册 TODO）；
计数断言改动前已核当前在册数=23（ps_ 20+core_ 3，manifest 实查 2026-09-22），build.py
clips 断言按 23 保持，注册后 39 由主线改（TODO 注明）；测试静音双保险（每页面 goto 前
挂静音 init_script r28 定稿 function 版+种档 settings{sound:false,tts:false,vol:0}）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·ch1 起 6 方位含左右（域 4→6 全档）**：
- `domainOf(dch)` 恒返回 POS6（DOM4 常量退役删除）；cells 恒全摆 6 格（固定 POS6 序）。
- 左右=6-7 岁巩固期难点（r33 whereistand 同判），从 flat0 起进（原 ch3 引入=两章空窗）。
- ch1 保留「兔子初始位高亮 1.2s」降坡锚（左右首进的坡度缓冲：先亮 1.2s 再纯看图作答
  不迟于题内自由探索）；ch2 起高亮即刻消失（原 ch1/ch2 的差异轴保留）。
- **调整理由**：审计建议「ch1 起 6 方位」照单采纳。flat0 q0 教学
  演示锚（findpos/front）语义保留——见 §R2 锚面消歧。

**维度二·双参照物复合 dual（ch3 主载，兔子隐藏=纯听觉方位推理）**：
- 场景增第二参照物**小房子**（SVG data-scene="house"），位置 seeded 从合法位池取：
  `left-down`（场景左下，中心 60,443）/`right-down`（场景右下，中心 270,443）。
- 几何论证（CELL_GEO 场景坐标 330×490，写前验算）：房@left-down 84×76 → x[18,102]、
  y[405,481]：与 left 格（x[10,110],y[248,352]）y 不交（405>352）✓ 与 down 格
  （x[113,217],y[378,478]）x 不交（102<113）✓ 视觉无重叠；**房的方位格**（正交相邻
  对齐）：房的「上面」=left 格（x 同轴，房中心 y443 上方最近格中心=left 格 y300）；
  房的「右边」=down 格（y 对齐 443≈428 差 15px，x 右邻）。房@right-down 对称：
  上面=right 格、左边=down 格。
- **组合封闭表 DUAL_COMBOS（恰 4 组合，交恒唯一）**：
  | # | house | tree 约束（ask） | house 约束（ask2） | answer 格 |
  |---|-------|------------------|--------------------|-----------|
  | lu | left-down | left | up | left 格 |
  | dr | left-down | down | right | down 格 |
  | ru | right-down | right | up | right 格 |
  | dl | right-down | down | left | down 格 |
- 题面（全句 clip）「兔子藏在树的左边，也在房子的上面」；**兔子隐藏不渲染**
  （bunnyAt=null——防「点兔子读图」绕过推理，直击审计「读图指位」主诉）；点对=兔子
  pop-in 出现在答案格+确认链。
- **认知负荷论证**：①长句（16 全字符）双约束听觉工作记忆；②**房参照换算**——「房子
  的上面」≠屏幕上面（房在左下角，它的上面=屏幕中左的 left 格），孩子须把方位锚从
  自身视角重设到房子视角（物参照系入门）；③左右巩固（left/right 组合占 2/4）。
- **诚实披露（§R12 详）**：本复合非「交集筛选」结构——六格环几何下每约束各自唯一指向
  答案格（组合表定义两约束同格），正确解析任一约束即可定位；错误源=方位词镜像混淆/
  房参照换算错（把「房子的上面」当屏幕上面→up 格）/长句 WM 丢失，均为真错误源而非
  假干扰。交集筛选结构需格阵布局，破坏六方位环玩法框架，不做（r33 two 题「单判定点
  保框架」同论证）。

**维度三·视角转换 flip（ch4 主载，兔子朝向态=绝对→相对方位推理）**：
- 兔子增**背面态** SVG（转身 180° 背对孩子：两耳后侧+圆背+尾棉球+无脸——视觉诚实，
  背面看不到脸）；渲染标记：bunny div class="bunny back"、格 cell data-face="back"，
  g[data-anim="bunny"] 锚保留（契约 M 不断）。
- 题面（全句 clip）「兔子转过身去啦，它的左边是树的哪边呀」；ask=兔子说的方位（兔
  子视角），**answer=M(ask) 格**——**180° 转身映射表 FLIP_MAP（对合群，写前验算）**：
  `left↔right、front↔back、up→up、down→down`（转身后左右互换、前后互换、上下不变
  ——上下不变=物理事实，作「全反转」口诀化的对照面，防背口诀）。
- **bunnyAt=域内随机 ≠ M(ask) 格**（兔子背面态坐在非答案格——若兔在答案格则点兔=读图
  绕过映射，结构性禁止）；点对=格子 lit+教育确认句链。
- **认知负荷论证**：Level-2 视角采择（6-7 岁正获得期）——孩子须在脑中把自身视角旋转
  180° 映射到兔子视角再落到树的方位格坐标系；直觉答案（屏幕同名格）恒为错（r33 flip
  「首遇必错=设计内难度，零惩罚+pulse+救援兜住」先例沿用）。

**维度一的章谱联动（原 ch3 两族混出前移 ch2）**：
- 原 ch1（4 域 findpos+锚）/ch2（4 域 findpos 纯看图）压缩为新 ch1 一章（6 域 findpos
  +锚→纯看图由高亮消失轴承载）；原 ch3（6 域两族混出）前移新 ch2；ch3/ch4 让位给
  dual/flip 新题型。净效果=全谱整体上探一章（宁难勿易）。

## §R2 章谱（新四型+章构成律；CH_LEN=5、静态 20 关=4 章×5 关不变）

| 章 | flat | 名称 | 构成律（qi0..qi4） | 域 | 特征 |
|----|------|------|--------------------|----|------|
| ch1 | 0-4 | 兔子在哪里 | 5×findpos（qi 相邻互异） | 6 格 | flat0q0=findpos/front 锚；兔子初始位高亮 1.2s |
| ch2 | 5-9 | 你来放一放 | 5×coin(findpos/placepos)+全同翻 1（两族恒在场） | 6 格 | 高亮即刻消失（纯看图） |
| ch3 | 10-14 | 房子来帮啦 | qi0=findpos（热身+救援腿兼容）+qi1-4=shuffled([dual,dual,dual,coin()]) | 6 格 | **dual 恒 3/关**（静态 5 关=15 题）；房子渲染 |
| ch4 | 15-19 | 转过身啦 | qi0=findpos+qi1-4=shuffled([flip,flip,flip,coin()]) | 6 格 | **flip 恒 3/关**（静态 5 关=15 题）；背面兔 |
| 生成 | ≥20 | —— | dch=ri(rnd,1,4)（**不变**），按 dch 取上表构成律 | 6 格 | 四章型复现 |

- coin()=rnd()<0.5 ? 'findpos' : 'placepos'（每消耗 1 次 rnd）。
- 生成关先取 dch 再取 specs（原序保留——「先取数保确定性」注释语义不变）。
- **flat0 q0 锚面消歧（显式声明）**：「逐字节保留」的两层口径——①**语义/教学面**
  （kind=findpos、ask=front、bunnyAt=front、answer=front 格下标 0、教学链三段
  watch→help→solo、turn 首题 placepos/front 定制、演示点前面格）**逐项保留**；
  ②**投影谱面**：投影器输出 [kind,ask,ask2,house,face,bunnyAt,answer]，flat0q0
  投影 `['findpos','front',null,null,null,'front',0]` 与 baseline 同键同值（baseline
  语义投影即此七元组，见 §R11）——**逐字节一致**；③cells 域 4→6 为 delta 明令
  （ch1 起 6 方位）的必然面，full 投影该字段必变，不属锚面（教学演示行为「幽灵手指
  点前面格=兔子所在格」在 6 格场景下语义不变，verify ⑧ 实测覆盖）。

## §R3 生成规则（rnd 消耗序列定版——pycheck 位级复刻依据）

```
genLevel(flat):
  ch = flat//5+1; dch0 = (ch-1)%4+1; lv = flat%5
  rnd = mulberry32(flat*7919+977)          // seed 不变
  dch = flat<20 ? dch0 : ri(rnd,1,4)       // 生成关先取数（1 次 rnd）
  specs = specSeqOf(dch, rnd, flat)        // 见下
  quizzes = specs.map(buildQuiz)           // 见下

specSeqOf(dch, rnd, flat):
  dch1: qi=0..4 各 {kind:'findpos', pos: POS6[⌊rnd*6⌋]}      // 1 次/题
  dch2: qi 各 {kind: coin(), pos: 同上}                        // 1 次/题
        后置：全 findpos→specs[0].kind='placepos'；全 placepos→specs[0].kind='findpos'
  dch3: specs[0]={kind:'findpos', pos:同上}
        rest=shuffled([{dual},{dual},{dual},{kind:coin(),pos:同上}], rnd)  // 3 次 swap
        其中 dual spec={kind:'dual', combo: ri(rnd,0,3)}       // 1 次
        specs[1..4]=rest
  dch4: specs[0]={kind:'findpos', pos:同上}
        rest=shuffled([{flip×3 各 {kind:'flip', pos: POS6[⌊rnd*6⌋]}} + {kind:coin(),pos:同上}], rnd)
        specs[1..4]=rest
  flat===0: specs[0]={kind:'findpos', pos:'front'}             // 教学锚（覆写）
  相邻互异兜底：specKey=s.kind+':'+(dual: tree+'/'+houseDir | flip/其他: pos)；
    相邻同 key 重掷（≤8 次，重掷按原 kind 域重取 pos/combo——kind 不变防构成律破坏）

buildQuiz(spec, dch, rnd):   // cells=cellsOf(dch)=POS6 恒全摆（6 格固定序）
  findpos:  bunnyAt=spec.pos; answer=cells 下标(pos)            // 0 次 rnd
  placepos: others=POS6∖{ask}; bunnyAt=others[⌊rnd*5⌋]         // 1 次
            answer=cells 下标(ask)
  dual:     combo=DUAL_COMBOS[spec.combo]; ask=combo.tree; ask2=combo.houseDir;
            house=combo.house; bunnyAt=null; answer=cells 下标(tree)   // 0 次
  flip:     mirror=FLIP_MAP[ask]; others=POS6∖{mirror};
            bunnyAt=others[⌊rnd*5⌋]; face='back'; answer=cells 下标(mirror)  // 1 次
```

- 互异重掷的 rnd 消耗：dch1/dch2 重掷 1 次（pos）；dch3 dual 重掷 1 次（combo）；dch4
  flip 重掷 1 次（pos）；placepos/flip 的 bunnyAt 取数在 buildQuiz（重掷不改 bunnyAt
  消耗数——每题恰 1 次）。
- shuffled（Fisher-Yates，n 元素 n-1 次 rnd）与 ri/coin 均与 JS 引擎逐位同源（pycheck
  位级对账）。
- **shuffled 元素求值序（JS 数组字面量语义）**：dch3/4 的 `[mkDual()×3, mkCoin()]`/
  `[mkFlip()×3, mkCoin()]` 先**逐元素求值**（dual=3×1 次 combo、flip=3×1 次 pick、
  coin=2 次——共 5 次 rnd）**再** shuffle（3 次 swap）——pycheck 按此序消耗。

## §R4 封闭表（verify ①b/⑤ 独立对账依据；表外不出题不出句）

```
POS6      = ['front','back','left','right','up','down']          // 方位封闭 6（不变）
POS_NAME  = {front:前面, back:后面, left:左边, right:右边, up:上面, down:下面}
FLIP_MAP  = {left:'right', right:'left', front:'back', back:'front', up:'up', down:'down'}
DUAL_COMBOS = [ {key:'lu', house:'left-down',  tree:'left',  houseDir:'up'},
                {key:'dr', house:'left-down',  tree:'down',  houseDir:'right'},
                {key:'ru', house:'right-down', tree:'right', houseDir:'up'},
                {key:'dl', house:'right-down', tree:'down',  houseDir:'left'} ]
PLACE_TTS  = '把兔子放到树的'+POS_NAME[p]                          // 6 值（不变）
CONFIRM_TTS= '兔子在树的'+POS_NAME[p]+'呀'                        // 6 值（不变）
DUAL_TTS   = { lu:'兔子藏在树的左边，也在房子的上面',
               dr:'兔子藏在树的下面，也在房子的右边',
               ru:'兔子藏在树的右边，也在房子的上面',
               dl:'兔子藏在树的下面，也在房子的左边' }              // 4 值（新）
FLIP_TTS   = '兔子转过身去啦，它的'+POS_NAME[p]+'是树的哪边呀'   // 6 值（新，18 全字符；POS_NAME 含「边」——
                                                                  // 修复轮 m2 勘误：原式多拼「边」得 19 字「左边边」）
FLIPY_TTS  = '转身以后，它的'+POS_NAME[p]+'就是树的'+POS_NAME[FLIP_MAP[p]]+'呀'
                                                                     // 6 值（新，16 全字符；同上勘误）
HOUSE_GEO  = { 'left-down':{cx:60,cy:443,w:84,h:76}, 'right-down':{cx:270,cy:443,w:84,h:76} }
CHAPTERS   = {1:{name:'兔子在哪里', hint:'要放兔子啦，你来试试'},
              2:{name:'你来放一放', hint:'小房子也来啦，两个一起找'},
              3:{name:'房子来帮啦', hint:'小兔子会转身哦，想想它的左右'},
              4:{name:'转过身啦',   hint:'新一轮方位小侦探'}}
GEN_HINTS  = ['前后上下左右找到它',   // dch1 findpos 6 域
              '你来放一放',           // dch2 两族混出
              '小房子也来啦',         // dch3 dual 主载
              '小兔子转个身']         // dch4 flip 主载
```

- CHAPTERS[k].hint ↔ CHAPTERS[k+1] 预告律（家族 F 禁右移）+ GEN_HINTS[k] ↔ dch=k+1
  （verify ⑮ 独立硬编码对账，文案随新章谱全换）。
- DOM4/domainOf 章域分裂退役：cells 恒 6 格（structWhy 的 dch4grid/dch6grid 分支合并
  为「恒 POS6 序 6 格」单判）。

## §R5 渲染与交互（玩法框架保留下的新增面）

- **房子渲染**：q.kind==='dual' 时在 #cells 层外挂 div.house（percentage 定位按
  HOUSE_GEO，z=15：树 20 之下、格层不干扰——几何已论证无重叠，z 仅保险）；svg 根
  g[data-scene="house"]（契约 M 锚）；非 dual 题移除。房子不设 pointer-events
  （参照物非作答面；点房子落 sceneEl 空白路径=重听题面）。
- **背面兔渲染**：q.face==='back' 且 c.pos===q.bunnyAt 时 bunny div class="bunny
  back"、内嵌 bunnyBackSvg()（g[data-anim="bunny"] 锚保留——帧内容断言按「兔子 SVG
  根锚」不断朝向）；正面兔 bunnySvg() 原样。
- **dual 答对演出**：答案格 lit+兔子 div pop-in（.bunny+.pop-in，400ms 弹入）——
  「藏的兔子出现」即验算；无飞入（无 fromPos）。
- **flip 答对演出**：答案格 lit（无兔出现、无飞入——兔子保持背面态原地）；确认句
  FLIPY_TTS[ask] 视觉承载+教育链播报（映射律显性化）。
- **placepos 飞入**：原 flyBunny 不变（q.kind==='placepos' 分支已隔离）。
- **dirAnchor（方向级回锚）按题型分流**：findpos=兔 pulse / placepos=场景 pulse /
  **dual=房子 pulse**（新参照物锚提示「看两个参照物」，不泄答案格——房子非作答格）/
  **flip=兔 pulse**（背面兔 pulse 提示「看兔子朝向」，兔子在非答案格不泄答案）。
- **答案级 breathe**：miss≥2 正确格 breathe 恒用（全题型同，§0.80 v1 定版延续）。
- **PS.quiz getter 扩展**（新题型字段+step 语义列）：
  | kind | ask | ask2 | house | face | bunnyAt | answer | step 语义 |
  |------|-----|------|-------|------|---------|--------|-----------|
  | findpos | 兔子位（=问句方位） | null | null | null | =ask | ask 格下标 | 关内题号 0..4 |
  | placepos | 指令目标位 | null | null | null | 兔当前位≠ask | ask 格下标 | 同上 |
  | dual | 树约束方位 | 房约束方位 | 房位 key | null | **null（隐藏）** | 树约束格下标 | 同上 |
  | flip | 兔子说的方位 | null | null | 'back' | 背面兔所在位≠M(ask) | M(ask) 格下标 | 同上 |
  step=cur.step 关内题号（0 基推进，与 v1 语义一致）；tapCell 返回值语义不变
  （对 'right'/末题 'done'/错 'wrong'/越界 null）。

## §R6 语音链（两段制：新键只设计不注册；未注册期=静默+视觉承载）

- 开题链：findpos=[ps_q1] / placepos=[ps_place_<ask>] / **dual=[ps_dual_<combokey>]**
  / **flip=[ps_flip_<ask>]**——新键未注册期 core.voice.play 回退 speak→Task#46 删
  speechSynthesis=静默（r37 先例：SPEC 声明注册后自动接链；q-text 全句视觉承载不缺
  信息——不识字孩子注册后即有声，属主线段二完成项）。
- 确认链：findpos/placepos/dual=[ps_right, ps_n_<ask>, ps_ya]（现有链零改动；dual
  名音=树约束方位）；**flip=[ps_right, ps_fy_<ask>]**（教育句承载映射律；未注册期
  ps_fy 静默但窗按 est 口径挂——宁等勿叠，r24 口径）。
- 错链（全题型同）：[ps_wrong, ps_hint]+wrongChainUntil=4970 豁免窗——零改动。
- 重听/救援重读：按题型走开题链同键（replayQuiz/speakQuiz 同源）。
- 教学链：watch（findpos 演示）→turn（placepos/front 定制）→solo——零改动（flat0
  q0 锚面 §R2 ①③）；dual/flip 不进教学（章末预告+救援双锚兜底，r33/r34 新题型同先例）。

## §R7 新语音键清单（16 键，games=['position']——**已注册 2026-09-22 主线段二，manifest 5350→5459（ok=16 fail=0）**）

前缀 ps_ 已核 manifest 无占用（2026-09-22 实查在册 23 键无下列键名）；estMs(n)=n×345+600
（全域最长串口径；注册后实测复核**已完成**——实测全低于 est，见 §R8 补记）：

| key | 文案 | estMs | 消费点 |
|-----|------|-------|--------|
| ps_dual_lu | 兔子藏在树的左边，也在房子的上面 | 6120 | dual 开题/救援重读（combo lu） |
| ps_dual_dr | 兔子藏在树的下面，也在房子的右边 | 6120 | dual（combo dr） |
| ps_dual_ru | 兔子藏在树的右边，也在房子的上面 | 6120 | dual（combo ru） |
| ps_dual_dl | 兔子藏在树的下面，也在房子的左边 | 6120 | dual（combo dl） |
| ps_flip_front | 兔子转过身去啦，它的前面是树的哪边呀 | 6810 | flip 开题（ask=front） |
| ps_flip_back | 兔子转过身去啦，它的后面是树的哪边呀 | 6810 | flip（ask=back） |
| ps_flip_left | 兔子转过身去啦，它的左边是树的哪边呀 | 6810 | flip（ask=left） |
| ps_flip_right | 兔子转过身去啦，它的右边是树的哪边呀 | 6810 | flip（ask=right） |
| ps_flip_up | 兔子转过身去啦，它的上面是树的哪边呀 | 6810 | flip（ask=up） |
| ps_flip_down | 兔子转过身去啦，它的下面是树的哪边呀 | 6810 | flip（ask=down） |
| ps_fy_front | 转身以后，它的前面就是树的后面呀 | 6120 | flip 答对教育链（映射律） |
| ps_fy_back | 转身以后，它的后面就是树的前面呀 | 6120 | flip 答对（ask=back） |
| ps_fy_left | 转身以后，它的左边就是树的右边呀 | 6120 | flip 答对（ask=left） |
| ps_fy_right | 转身以后，它的右边就是树的左边呀 | 6120 | flip 答对（ask=right） |
| ps_fy_up | 转身以后，它的上面就是树的上面呀 | 6120 | flip 答对（ask=up，不变对照） |
| ps_fy_down | 转身以后，它的下面就是树的下面呀 | 6120 | flip 答对（ask=down，不变对照） |

- 注册后联动（原主线段二 TODO，**已于 2026-09-22 段二全部执行**）：manifest position
  23→39（ps_ 36+core 3）；build.py `n_clips==39`+PS_KEYS 扩 16；game-verify ⑫ psKeys 39
  +SPEC_DUR 扩 16 实测实长；gate_common33 G3 计数 39；窗常量复核=实测全低于 est 不调
  （§R8 补记）。

## §R8 窗数学（estMs 四方=data/verify/build/_selftest 同步；est 口径+注册后实测补记）

| 窗 | 值 | 算式/依据 |
|----|-----|-----------|
| 确认链演出窗（findpos/placepos/dual） | 1600+3900=5500 | ≥2280+150+名音 max 1416+150+ps_ya 1152+300=5448（不变） |
| **flip 答对演出窗** | **1600+7400=9000** | ≥est 链 2280+150+6120+300=8850 **且 ≥ 实测链 2280+150+4272+300=7002**（注册后实测复核 2026-09-22：ps_fy 实测 4152-4272 全低于 est 6120——**窗不调**，est 断言保留=保守上界+实测断言并列双锁） |
| 错链豁免窗 | 4970 | ≥1656+150+2856+300=4962（不变） |
| dual/flip 开题读题 | 异步不锁输入 | 无窗（同 v1 q1/place 全句） |
| 教学 watch/turn 窗 | 3400/2700/2100/320/300 | 全不变（教学链零改动） |
| estMs 全字符口径 | n×345+600 | 家族 T（不变） |
| DUAL_TTS 4 句 | 16 全字符 | estMs=6120；**注册后实测 4128-4200（max 4200）** |
| FLIP_TTS 6 句 | 18 全字符 | estMs=6810；**注册后实测 4488-4536（max 4536）** |
| FLIPY_TTS 6 句 | 16 全字符 | estMs=6120；**注册后实测 4152-4272（max 4272）** |

- 实测口径来源：mutagen 实长（F:/Cache/temp/r456_clip_ms.json，2026-09-22 主线合成后
  实测）；三条 est 全部高于实测（dual 6120>4200 / flip 6810>4536 / fy 6120>4272）——
  窗一律不调，仅回填实测口径注记。
- build.py 静态断言：flip 窗 `1600+7400 ≥ 2280+150+6120+300`（est）+`≥ 2280+150+4272+300`
  （实测 FY_MEAS 并列）；verify ⑯ 动态断言同式（SPEC_DUR=在册 23 键+16 新键实测实长全表）。

## §R9 verify/_selftest 单元（改造后清单）

- verify（?verify=1，title='VERIFY PASS n/n'）：①①b 40 关审计+SPEC 表（四型形状/域恒
  6 格/构成律聚合：dch1 恒 findpos、dch2 两族在场、dch3 dual=3+findpos≥1、dch4
  flip=3+findpos≥1）②聚合（生成关 dch1-4 全现+dual 组合 4 值全域覆盖 ≥1+flip ask 6
  值全域覆盖 ≥1+answer 位直方图下界——**下界从均匀期望独立推导**：全域 200 题 answer
  位 6 桶全均匀期望 ≈33/桶，但 dual 组合 tree 池无 up/front →最稀桶先验期望被压至
  ≈28，下界取 ≥14（最稀桶期望半的保守口径；确定性谱实测精确值另入 §R11 供
  pycheck 对账））③tapCell flat0④placepos（flat5 seekKind）④b dual 单元（flat10：
  形状/DOM 无兔+房子锚/半对干扰格错选/答案级 breathe/点对兔 pop+确认链/重听单 clip）
  ④c flip 单元（flat15：形状/背面兔 DOM 锚/直觉同名格=wrong 实测/点对教育链
  [ps_right, ps_fy_ask]/翻转窗 7400 在场）⑤TTS 表（PLACE/CONFIRM 6+DUAL 4+FLIP 6+
  FLIPY 6 独立串对账+estMs 字符数）⑥遮挡（原+房子 z=15 断言）⑦帧内容（flat0/flat10/
  flat15 三档：domOk+bunnyOk 按题型分流+house/face 锚）⑧教学（不变）⑨吞输入（不变）
  ⑩冒烟（flat0/flat5/flat10 dual 通关/flat15 flip 通关）⑪布局（双视口×flat0/10/15，
  格 ≥96 恒 6 格；房子布局无专项断言——百分比定位+⑪ ox 总闸+真机域，修复轮 m3 措辞收敛）
  ⑫clips 23（在册口径）⑬星级⑭契约源码（+FLIP_MAP/
  DUAL_COMBOS/flip 窗 7400 锚）⑮hints 新表⑯estMs 窗（+flip 链式）⑰SPEED。
- _selftest.py（新建，headless 独立 chromium）：1 verify 复跑+专项分布 2a 预置档真实
  pointer 首错/二错/答对/通关/写档 2b 全新档教学链真实走完+tutSeen 持久化 2c flat10
  dual 题真实点击（组合独立复算+房子 DOM 取证）2d flat15 flip 真实点击（映射独立
  复算+背面兔 DOM 取证）2e 双视口 overflowX=0+像素非空白 3 完全离线+0 pageerror
  4 救援钟 14s 重读（flat≥3）。
- pycheck（_r44_pycheck.py）：SPEC §R3 生成律 Python 位级复刻（mulberry32 Math.imul
  截断乘/全程 &0xFFFFFFFF），40 关逐字段（kind/ask/ask2/house/face/bunnyAt/answer）
  与 post-full.json 对账；断言从 SPEC 文字推导禁抄实现。

## §R10 六门禁数字（2026-09-22 收官实测）

| 门禁 | 结果 |
|------|------|
| ①build.py 双跑幂等 | md5 `70f6d6301971b4ff92f2bdc7a8d84b79` / 570587 chars（596782 字节，双跑一致） |
| ②VERIFY 双视口 | 1280×800：VERIFY PASS 61/61；800×1180：VERIFY PASS 61/61；0 pageerror |
| ③_selftest.py | 40/40 PASS（含 verify 复跑+2a/2b/2c/2d/2e+救援钟+离线+0 pageerror） |
| ④pycheck | 40/40 identical（+构成律先验自证 bad=[]、锚面 True） |
| ⑤gate_common33.py（position PS，clips_n=23 在册口径） | 3/3（G1 verify 61/61/G2 教学链+通关 3★+写档/G3 clips 23 miss=[]） |
| ⑥谱投影 post json | r44-post.json + r44-post-full.json 40 关 200 题落盘（§R11） |

## §R11 谱投影 baseline-post（r27 m4：谱证据工具随款归档 _src/）

- 工具：`_r44_extract.py <out> [--full]`（语义投影 [kind,ask,ask2,house,face,bunnyAt,
  answer]；--full 全字段供 pycheck）。
- baseline（改造前，2026-09-22 提取）：`r44-baseline.json`/`r44-baseline-full.json`——
  kinds={findpos:145, placepos:55}；asks={front:48,up:33,back:44,down:48,left:17,
  right:10}（left/right 少=ch1-2 无左右的历史印证）；flat0q0 投影
  `['findpos','front',null,null,null,'front',0]`。
- post（改造后，2026-09-22 提取）：`r44-post.json`/`r44-post-full.json`——
  kinds={findpos:110, placepos:30, dual:33, flip:27}；asks={front:28, back:30,
  left:37, right:35, up:22, down:48}（左右 37/35 vs baseline 17/10=delta 生效直接印证）；
  dualCombo={lu:8, dr:7, ru:8, dl:10}；flipAsk={front:7, back:4, left:2, right:4,
  up:4, down:6}；answer 位={front:25, back:33, left:39, right:33, up:22, down:48}
  （min=22 ≥ 下界 14 ✓）；flat0q0 投影与 baseline 逐字节一致（§R2 ②口径，实测
  `['findpos','front',null,null,null,'front',0]` 两谱同键同值）；与 baseline 逐题比对
  172/200 不同、无整同关=全 40 关刷新（rnd 消耗序列变化，r33 同型），仅 flat0q0
  七元组不变。
- 对拍链：post-full.json ↔ pycheck（Python 复刻）↔ verify ①页内审计——三方互证。

## §R12 披露与登记

1. **dual 单约束充分性**（§R1 已述）：六格环几何下复合非交集筛选结构，任一约束正确
   解析即可定位；负荷承载=房参照换算+长句 WM+左右巩固。交集筛选需格阵布局破坏框架，
   登记 backup（若审查要求真交集，候选=格阵化 2×3 布局重排，属大改）。
2. **flip 直觉格首错高发**：直觉同名格（屏幕 left 格 vs 兔子说的 left→answer=right 格）
   恒为错——r33 先例「首遇必错=设计内难度」，零惩罚探索+pulse+救援双锚兜住；真机观察
   项：首错率>80% 则考虑首错自动重读（r33 P2-2 同款登记）。
3. **未注册新键静默期**：dual/flip 开题与 flip 教育链在主线段二注册前无声（q-text 视
   视觉承载）；注册后自动接链（r37 先例）。**不阻塞段一交付**（游戏机制完整、静音面
   与 r37 时序一致）。
4. **flip 窗宁等勿叠**：未注册期 ps_fy 静默实际链长 2430，窗按 est 8850 口径挂 9000
   ——每题多等 ~6.4s（verify 页 SPEED=0.12 提速后 ~0.77s）；注册后实测复核若 >6120
   则窗同步上调（TODO）。
5. **answer 位分布**：cells 固定 POS6 序→answer 位=由 ask/mirror 决定；ask 均匀取数
   →answer 近均匀，verify ② 下界断言+pycheck 精确对账双防线（r39-bis 教训①）。
6. **baseline 谱 vs post 谱**：全 40 关刷新（谱面变化=设计内，非锚破坏）；存档兼容=零
   迁移（存档键/CH_LEN/星级/进度键 `c-l` 格式全不变，旧档直接续玩新谱——flat 号语义
   连续，章名/预告文案变化无存档耦合）。

## §R13 实施记录（append-only）

- 2026-09-22 段一实施：SPEC 定稿（本文件）+五件套改造+工具三件（_r44_extract/
  _r44_pycheck/_selftest）+rebuild+六门禁自测（§R10 全绿）；新键 16 只设计不注册
  （§R7），主线段二注册后联动 §R7 尾注+窗常量复核。
- 2026-09-22 实施中修正三处（自测抓出，SPEC 本就正确、实现对齐）：①buildQuiz dual
  分支 target 误用 spec.pos（dual spec 无 pos 字段）→answer=-1，改为
  DUAL_COMBOS[spec.combo].tree（§R3 本就如此写）；②dch2 全同翻 1 两分支写反
  （全 findpos 未翻 placepos→flat5 单族），按 §R3 互换；③FLIP_TTS/FLIPY_TTS 表构建
  POS_NAME 已含「边」字再拼「边」=「左边边」重字（verify ⑤ 独立串对账抓出），去重；
  estMs(18) 口径勘误 6800→6810（18×345+600，全文同步）。另：verify ④ placepos
  domOk 旧断言=谱耦合 seed 巧合（答对 renderQuiz 换新题后兔位≠本题 ask 恰巧同格），
  改 1600ms 演出主窗内取样（r43 M4 同族教训），非游戏缺陷、断言语义对齐。
- 2026-09-22 排障方法论记录：verify 页 runVerify 与外部 evaluate 探针并发互踩
  （探针 startLevel 换 cur 致 runVerify 状态错位）——verify 页排障必须用被动拦截
  （PS.quiz getter 包装记快照流），禁并发驱动。

## §R14 段二终态（2026-09-22 主线注册后联动收官）

主线已注册 16 新键（manifest 5350→**5459**，ok=16 fail=0，mp3 已合成 voice/clips/）；
段二联动全部执行+六门禁重跑全绿。**md5 链：段一 `70f6d6301971b4ff92f2bdc7a8d84b79`
（570587 chars/596782 字节）→ 段二 `7560178a92d2639e9b093359599b0ad7`（1124319
chars/1150697 字节，增量=16 条 mp3 base64 注入）**，build 双跑幂等。

| 门禁 | 段二结果（2026-09-22 重跑） |
|------|------|
| ①build.py 双跑幂等 | md5 `7560178a92d2639e9b093359599b0ad7` / 1124319 chars（双跑一致，n_clips=39） |
| ②VERIFY 双视口 | 1280×800：VERIFY PASS 61/61；800×1180：VERIFY PASS 61/61；0 pageerror |
| ③_selftest.py | 40/40 PASS（静音 init_script ended 5ms→1500ms 口径，零行为回归） |
| ④pycheck | 40/40 identical + LAW bad=[] anchor=True；新页重提取谱投影与段一
  r44-post.json/r44-post-full.json **逐字节一致**（md5 8523a72d/a55b84cb）=注册
  零触 rnd 流实证 |
| ⑤gate_common33.py（position PS，clips_n=39） | 3/3（G1 verify 61/61 / G2 教学链+
  通关 3★+写档 / G3 clips n=39 miss=[]） |
| ⑥谱投影 | 不变（同④逐字节一致；§R11 post 数字仍有效） |

段二联动清单（全部落地）：
1. build.py：n_clips 23→39+PS_KEYS 扩 16（dual 4+flip 6+fy 6）+r44 TODO 注释销账；
   ②b 补 FY_MEAS=4272 实测并列断言（est 断言保留）。
2. game-verify.js：⑫ psKeys 扩 16+preOk 39；SPEC_DUR 扩 16 新键实测实长（duration
   辨别器 ±60ms 自动覆盖）；⑯ winOk 加实测链并列断言+estData 扩 flipNeedMeas/
   maxFyMeas；头注与 dual/flip 单元「未注册期」措辞销账。
3. gate_common33.py：G3 注释 position=16→39（脚本本身无硬编码 n——计数为命令行
   第 3 参，本次显式传 39 验证）；soundcount/robotpaint 口径不动。
4. 静音纪律：_selftest.py/_r44_verify_run.py MUTE_JS ended 5ms→1500ms（防外放兜底
   更保守；测试页 voice 全 stub/settings sound:false，此层零触发双保险）。
5. _selftest.py：无 clips 计数/键断言（grep 核实），无需联动。
6. voice/gen_clips.py 与 manifest：**未动**（主线独占已完成，段二禁触）。

静默期收口：§R12.3（未注册新键静默）与 §R12.4（flip 窗宁等勿叠多等 ~6.4s）两条
披露的状态面已终结——dual/flip 开题与 flip 教育链注册后自动接链（r37 先例），ps_fy
实测 4272 使窗内实际等待回归链实长口径（9000 窗 vs 实测链 7002，余量 1998ms）。

## §R15 修复轮终态（2026-09-22 晚，审查 0/1/5 收口）

- **M1 ④c 采样关 flat15→flat16**：flat15 首道 flip ask=down 恒等（FLIP_MAP(down)=down），
  直觉同名格=answer 退化分支实测不到「直觉格=wrong」专项面（r43 M4 同族；_selftest 2d
  同零覆盖）。修复=startLevel(16)（首道 flip qs1 ask=front→back 非恒等，谱实测核验）+
  **flShape 加非恒等断言 `qf.ask !== fSpec`**（谱/种子变更致恒等采样必红非静默退化——
  r39-bis 分布断言同思路）+恒等兜底分支降级纯防御（注释标注恒不达）。
- **m1 注释债销账**：game-data.js:84-86/96-97+game-main.js:5-7/10-11/351-352「未注册期
  静默/注册后 TODO」措辞六处→已注册实长口径（09-22 段二）；game-main.js:6「点交集格」→
  「两约束共指格（§R12.1 非交集结构）」；game-verify.js:636 simView「ch1-2=4/其余=6」
  v1 域注释→「r44 恒 6 格」。
- **m2 §R4 公式行勘误**：FLIP_TTS/FLIPY_TTS 原式 POS_NAME[p]+'边' 照抄得「左边边」（19 字）；
  删「边」回正确 18/16 全字符（§R7 键表/实现/注册文案本正确，纯文档债）。
- **m3 §R9 ⑪ 措辞收敛**：「房子不溢出」断言不存在→删该项+括注（房子布局归百分比定位+
  ox 总闸+真机域）；_selftest 2e 注释勘正（采样帧=flat10 qi0 findpos 帧非 dual 帧，
  文件名 position-dual-vp 历史沿用）。
- m4（flat12 相邻同答案）真机观察账；m5（⑮ genOk 同源残余）登记不改（文案面 hintOk
  独立兜底）。试玩 0 Blocker：flip 首错率 100% 触 §R12.2 阈值→「首错自动重读」设计
  候选挂账（r33 同族）；救援双锚 14.25s/30.32s 实证健康。
- **谱/rnd 零变化**：改动面=verify 采样关/断言/注释/SPEC，不触引擎（pycheck 复验）。
