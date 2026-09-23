# SPEC-R43-ROBOTDANCE — robotdance 兔子机器人学跳舞 难度加深（r43，AUDIT-67 段序 17 🟡）

> Executor 自拟（账本制：主线独立复验为准；两段制段一=游戏侧改造+新语音键集定稿，**禁动 voice/gen_clips.py、不写 manifest**）。
> 基线 md5 `893d610a866aee0776d6a35e1228b77a`（build 双跑幂等，398808 chars）；
> 谱基线 `r43-baseline.json`（40 关 200 题：dch1 13 关全 3 步 0 干扰 / dch2 7 关全 4 步 1 干扰 /
> dch3 9 关全 5 步 0 干扰 / dch4 11 关 3-5 步 0-2 干扰——与审计「3-5 步无重复+干扰≤2」精确吻合）。

## §R0 目标与验收

- 审计（A67 段序 17，实测 35-39s）：「3-5 步无重复序列+干扰≤2，记忆负荷偏低」。
- 三维度（派单承接，b32 段 6-7 岁宁难勿易）：
  1. **步数 3-5→6-8**（按章坡度：ch1 缓 4-5 过渡/ch2 6/ch3 7/ch4 8+生成关），**允许重复步**
     （相邻同动作 ≤2 连续禁 3 连）；
  2. **干扰 2→3-4 块**（非序列动作的干扰舞步块，与序列步同族防排除法）；
  3. **ch4「改一步」fix 题**：演示正确序列后呈现错版（某步被换），孩子指出哪一步跳错。
- 池 5→**10**（5 新动作+5 新名音键）——步数 6-8+干扰 3-4 的数学前提（原 5 池 6 步必重复且干扰=未用
  动作恒 0，两维度都无法落地）。
- 验收：build 双跑幂等 md5 + ?verify=1 双视口全绿（分段跑）+ _selftest 全绿 + pycheck 40/40 +
  谱 baseline/post 对照 + 锚面 flat0 q0 逐字节实证。
- 存档兼容：kidsgame_robotdance / sv.robotdance.tutSeen / levels 'ch-lv' 键全不动。

## §R1 记忆负荷论证（6-8 步对 6-7 岁 WM 7±2 的适配）

- 纯回忆（free recall）任务 6-7 岁容量约 4-5 项（b10 simon 序列 2→4 为绿款先例=纯听觉回忆）。
  本款是**「再认+复现」混合负荷**，与纯回忆的三点区别：
  1. **编码多通道**：watch 演示=动作形状（5 类线索色互异 SVG）+名音（3 字词）+序列位置三通道同时编码；
  2. **提取再认式**：build 相位每步=再认判断（候选块在场，非自由回忆生成），已填槽外化为记忆支架
     （第几步+已填前缀可见，逐位推进不要求一次性输出全序列）；
  3. **组块与监控双负荷**：重复动作让序列可组块（「跳跳拍」=1 组块）降低纯容量压力，但**次数与位置
     监控**新增负荷——「跳跳拍」vs「跳拍跳」集合相同序列不同，集合记忆策略彻底失效（§R2 防背声明）。
- 6-8 步落在 7±2 区间（8=+1σ 沿），配救援兜底：14s 方向级（当前步名音+槽 pulse）/30s 答案级（正确块
  breathe）/replay 无限重播/错零惩罚（miss 只计星不回退）——负荷上探不卡死。
- ch4 fix 题=**差异检测（再认）非回忆**：错版 8 格视觉恒在场，孩子与记忆中正确版逐格对比——保持
  （正确版序列）+对比（8 格扫描）双负荷，提取要求低于回忆、监控要求高于常规题。

## §R2 防背机制声明（「序列再认≠逐位复述」）

1. **重复步**：无重复序列可退化为「集合记忆」（记住用了哪几个+大致顺序）；有重复时集合相同序列不同
   ——必须逐位编码。ch3 起恒有重复（u=6<n），ch4 恒 ≥2 重复。
2. **禁 3 连**：同动作最多连续 2 次——「跳跳跳」会被 chunk 成单步记忆（边界模糊），禁 3 连保证每次
   重复都是独立的序列位置事件。
3. **干扰同族**：干扰=池中未用舞步（同池同族同视觉风格）——不能靠「类型/风格排除法」踢掉干扰，
   每块都需真实再认。
4. **fix 题防新奇检测+防集合记忆**：错版替换动作 bad **恒取自 steps 本身**（∈序列动作集且 ≠steps[k]）
   ——disp⊆steps 动作集（**无新奇动作**，「没见过的动作=错」检测不可用）；集合记忆同样不可用
   （8 格动作集合与演示版几乎同集，集合比对无差异信号）。计数线索的**定位不可用性**：disp 与 steps
   的动作计数差恰 2（steps[k] 计数 -1、bad 计数 +1）——孩子逐动作数数可发现「某动作多一次/少一次」，
   但 bad 在序列中出现 ≥1 次（k 位之外还有原出现），**次数线索不能定位是哪一位错**——定位仍须
   逐位序列比对（这才是本题的认知目标：逐位再认，r43 判黄核心「记忆负荷偏低」的正面处置）。
   structWhy 断言=fixNew（disp 每动作 ∈steps 集——无新奇动作恒成立）。
5. **fix 错步位 k 均匀掷**（非恒位，r39-bis F1 同族风险正面处置）：k=ri(0,n-1) 均匀+分布断言
   （§R6 直方图散布断言双落 verify/pycheck）。
6. **候选块顺序洗牌 seeded**（原样保留）：块位不泄序。

## §R3 难度谱定稿（CH_LEN=5 / STATIC_LEVELS=20 / 星级 0=3★,1-2=2★,≥3=1★ 不动）

| 章 | 步数 n | 序列不同动作 u | 重复数 | 干扰 d | blocks | 题型构成 |
|----|--------|---------------|--------|--------|--------|----------|
| dch1 | qi 表 [3,4,4,5,5]（q0=锚面 3 步） | u=n（3-5，无重复） | 0 | 3（q0 锚=0） | 6-8 | 常规×5 |
| dch2 | 6 | 6（无重复） | 0 | 3 | 9 | 常规×5 |
| dch3 | 7 | **6** | **≥1** | 4 | 11 | 常规×5 |
| dch4 | 8 | **6** | **≥2** | 4 | 12 | 常规×4+**fix×1**（kq=ri(0,4) 掷位） |
| ≥20 生成 | 同所在 dch（dch4 恒 n=8+fix×1） | 同 | 同 | 同 | 同 | 同 |

- 动作封闭池 **10**（表外不出题）：jump 跳一跳 / spin 转一圈 / clap 拍拍手 / stomp 跺跺脚 /
  wave 挥挥手（现有 5）+ **nod 点点头 / kick 踢踢腿 / shake 摇一摇 / bow 鞠个躬 / stretch 伸伸手**
  （新 5——3 字名与现有族同构，机器人可做动画）。
- u 上限推导：干扰=池中未用动作恒 d 个 → u ≤ 10-d；d=4 → u≤6（ch3/ch4 重复由干扰约束结构性保证）；
  d=3 → u≤7，ch2 取 u=6（与 ch3 连续）、ch1 取 u=n（过渡章无重复）。
- fix 题结构：`{kind:'fix', steps(正确 8 步), k(错步位 0-7 均匀), bad(替换动作), disp(=steps 克隆
  [k]=bad，错版显示序列), phase, solved}`；**disp 无 3 连**（bad 选择时排除构成 3 连的候选——
  防「3 连=违规=错误位」规则泄题）；disp⊆steps 动作集（bad∈steps 无新奇动作，§R2.4——steps[k]
  唯一出现时该动作从 disp 消失，故断言为「无新奇」而非「集合恒等」）。
- 章末预告（家族 F，文本非语音零 clip 联动）：
  CH1 hint「舞步变 6 步，还有捣乱动作」（预告 ch2）/ CH2 hint「整支舞 7 步，还有重复舞步」（预告 ch3）/
  CH3 hint「8 步长舞，有一跳是错的，找出来」（预告 ch4）/ CH4 hint「新一轮机器人舞步大挑战」（预告生成关）；
  GEN_HINTS：dch1「四五步舞，看清再拼」/ dch2「六步舞，小心干扰动作」/ dch3「七步舞，还有重复舞步，
  全都要记牢」/ dch4「八步长舞，找找哪一跳错了」。
- **锚面**：flat0 q0 = 旧律产物**逐字节保留**（3 步 0 干扰 3 块——genLevel(0) 时 quizzes[0] 走
  legacyQuiz 独立通道：OLD5 池 shuffled 取 3+min(2,0)=0 干扰+块洗牌，rnd 消耗序与旧 buildQuiz
  逐位一致）；教学关 genTutLevel（2 步 jump/clap）零改动；教学后真关首题=锚（3 步缓启自然）。

## §R4 生成律（确定性通道：mulberry32(flat*7919+823) 种子/常量不变）

rnd 消耗序（实现序钉死，pycheck 逐位对拍）：

- genLevel(flat)：dch 取数（flat≥20 → ri(1,4) 1 rnd 先取；否则 0 rnd）→ **dch4 加 kq=ri(0,4)（1 rnd，
  在 quizzes 循环前取）** → 逐题 buildQuiz。
- buildQuiz(dch, rnd, qi, isFix)：
  1. n：dch1 → CH1_STEPS[qi]=[3,4,4,5,5]；dch2 6/dch3 7/dch4 8（n 零 rnd）；
  2. u=min(n, U_CAP[dch])（U_CAP={1:5,2:6,3:6,4:6}）；
  3. moves=shuffled(MOVE_POOL_10, rnd).slice(0,u)（shuffled 消耗 9 rnd）；
  4. steps 构造：u≥n → steps=moves.slice(0,n)（ch1/ch2 无重复）；u<n → base=moves（u 个），
     extra=n-u 个重复注入：每个 `a=moves[ri(0,u-1)]`（1 rnd）+`pos=ri(0,len)`（1 rnd）插入，
     **3 连防御**：若插入成 3 连（steps[pos-1]==a && steps[pos]==a）则 pos 线性顺移至首个合法位
     （0 rnd，合法位恒存在——重复段 ≤2 时段间必有其他动作隔开）；
  5. fix 题（dch4）：k=ri(0,n-1)（1 rnd）；badCand=steps 动作互异集去除 steps[k]，
     bi=ri(0,len-1)（1 rnd），bad=**自 bi+1 起环扫首个 disp 无 3 连的候选**（0 rnd——
     §R4.5 勘误 2026-09-22 修复轮 M3：原文字「bad=badCand[bi]，构成 3 连**则**顺移」为
     条件顺移语义，实现（game-core）为无条件环扫——初始 bi 位除「其余候选全 3 连」
     （≥5 候选下不可达）外永不入选，rnd 消耗数同恒 1、分布均匀性不受影响；SPEC 从实现）；disp=steps 克隆 [k]=bad；
  6. 干扰：rest=POOL10 中不在 steps 集的动作（10-u 个）shuffled 取前 d=NEW_CAP[dch]={1:3,2:3,3:4,4:4}
     （shuffled(rest) 消耗 len-1 rnd；ch1 q0 锚题豁免——legacyQuiz 内 0 干扰）；
  7. blocks=shuffled(steps.concat(extras), rnd)（消耗 n+d-1 rnd；fix 题**无 blocks**——作答目标是槽，
     blocks=[]）。
- structWhy 全量重写：新步数表/u 上限/重复律（ch3 恒 ≥1/ch4 恒 ≥2）/禁 3 连（steps 与 disp 双查）/
  干扰恰 NEW_CAP 且=未用动作/块多重集计数对账（重复步=多同名块）/fix 结构律（k 域/bad∈steps 且≠steps[k]/
  disp===steps 恰换 k 位/disp 无新奇动作（⊆steps 集）/disp 无 3 连/blocks 恒空）/flat0 q0 锚豁免分支
  （旧律 3 步 0 干扰）。
- 答案位与块位：候选块顺序洗牌 seeded（保留）——常规题无「答案位」概念（按序多步点选，每步当前目标
  块位由洗牌分布）；**fix 题错步位 k 直方图散布断言**（§R6）。

## §R5 fix 题交互（单步判定，r25 M2 边界论证）

- 流程：watch 演示**正确版** 8 步（动画+名音逐段，同 playMoves；**watch 期槽=空槽**——修复轮
  M1 2026-09-22：disp 不提前泄出，「与记忆中正确版对比」的认知负荷才成立；replay 例外，见下）
  → 转场链 **[rbd_q_fix]**（新键
  「有一跳错啦，找一找」，单段异步不占 UI 窗）→ build：槽区静态显示 **disp 错版 8 格**（全填图标+
  序号，均匀呈现零视觉区分——不标出错误格）+块区隐藏 → 孩子点槽格 i：
  - i===k → 'done'：槽刷新为正确版 steps（视觉修正演出）→ dance=机器人跳**正确版**+确认链
    [名音×8, rbd_right]；
  - i≠k → 'wrong'：miss+1（retries 同口径计星）+错链 [rbd_wrong, rbd_hint]+豁免窗 4650（同常规）+
    错点格 wig（**勘误 2026-09-22 修复轮 minor5 裁定：原「+题面 pulse」不实现**——fix 语义下任何
    指向答案槽 k 的脉冲=泄底；格 wig+错链语音+miss≥2 答案级槽 k breathe 已构成完整反馈梯度，
    对位常规题 pulseSlot(q.pos) 的不泄底等效物=miss≥2 breathe）；**已答进度概念不适用**（单判定点，无中间态——r25 M2 天然满足；
    错后不锁死，豁免窗后可再点）。
- 判定引擎新函数 engTapSlot(L, i)（与 engTapBlock 同构单步原子判定）；uiTapSlot 入口 guard
  （locked/won/demo/豁免窗错点吞）与 uiTapBlock 同门同路径。
- 救援（双锚口径不变，fix 分流）：14s 方向级=播 rbd_q_fix（任务重述——比 hint「再想一想，下一步」
  语义准）+错版槽保留；30s 答案级=槽 k breathe+播 rbd_q_fix；答对/重播=刷 lastAct；错点=不刷。
- replay（fix 题）=重播正确版 watch 演示（rbd_replay 前导+playMoves；disp 槽保留在场上——对比锚
  不撤）；hear 按钮 fix 题播 rbd_q_fix（题面句重听）。
- autoSolve：fix 题分流 tapSlot(k)。
- 槽 pointerdown 分流：fix 题 build=作答；常规题=方向级提示（现行为保留）。

## §R6 分布断言铁律（r39-bis ①：SPEC 推导下界/散布，verify+pycheck 双落）

| 分布 | SPEC 推导断言 | 落点 |
|------|--------------|------|
| 步数谱 | dch1 逐题==CH1_STEPS[qi]（40 关聚合 n=3 计 13/dch1 关数；n=4 计 26；n=5 计 26）；dch2 全 6；dch3 全 7；dch4 全 8 | verify ①②+pycheck |
| 重复率 | dch1/dch2 dup==0 恒；dch3 dup≥1 恒（u==6）；dch4 dup≥2 恒（u==6） | 同上 |
| 禁 3 连 | 全 200 题 steps 与 fix disp 零 3 连（滑窗逐位查） | 同上 |
| 干扰下限 | dch1 dis==3（q0 锚==0 豁免）；dch2 dis==3；dch3 dis==4；dch4 dis==4 | 同上 |
| **fix 错步位 k 直方图**（F1 同族） | 总 N=11 题（静态 5+生成 dch4 6 关×1）；**散布断言**：distinct(k)≥4 且 max≤N/2+1（恒位回归=distinct 1/max N 必红；11 样本 8 位半值下界不可靠——**下界从均匀掷分布推导散布阈值**，实测校准防假红，见 §R11） | verify ①聚合+pycheck HIST 行 |
| fix 题位 kq | dch4 每关恒 1 题；kq 散布 distinct≥3（11 关掷位） | 同上 |
| blocks 构成 | 常规题 blocks=n+d 恰；fix 题 blocks==0 恒 | 同上 |

## §R7 新语音键集定稿（段一核心交付；**6 新键**，manifest 预估 5291→5297 真值主线回填）

| key | 文案（clip 合成文本=game-data.js 表一字一致） | 用途 |
|-----|---------------------------------------------|------|
| rbd_n_nod | 点点头 | 新动作名音（演示/舞/确认链/救援方向级） |
| rbd_n_kick | 踢踢腿 | 同上 |
| rbd_n_shake | 摇一摇 | 同上 |
| rbd_n_bow | 鞠个躬 | 同上 |
| rbd_n_stretch | 伸伸手 | 同上 |
| rbd_q_fix | 有一跳错啦，找一找 | fix 题转场链/救援方向级与答案级/重听 |

- 全部 3-9 字短句，与在册 rbd 族同 TTS（晓晓）；**前缀 rbd_ 已核 manifest 无占用**（新键后缀
  nod/kick/shake/bow/stretch/fix 均不在册——主线注册前 grep 复核）。
- 注册前过渡态（r39 §R10 先例）：play/queue 缺 clip=console.warn 静默（非 pageerror），视觉/交互/
  判定/演出/救援完整不受影响——_selftest 在缺 clip 态全绿为证；主线 gen_clips 注册后自动完整。
- **键链拼接纯函数直调断言（r37 M1）**：fix 转场链/dance 确认链含新名音的键构造由 verify 直调断言
  （`'rbd_n_'+id` 工厂+VOICE.fix.key 引用，期望链从本 SPEC 推导硬编码）。

## §R8 时序窗对账（r23 P2-1/r35 M-1 红线：SPEC 值=实现值；**estMs 低估区标注实测复核 TODO**）

| 窗 | 旧值 | 新值 | 依据 |
|----|------|------|------|
| STEP_MS（演示/舞单段窗） | 1734 | **1834** | 名音 max 1584（在册 5 键 1512-1584）+150 间隙；新 5 名音同族 3 字词**预估带宽 ≤1684**（±100 容差），1834=1684+150；**注册后 mutagen 实测复核 TODO**：若 max(新名音)≤1584 主线可回调 1734（裁量披露） |
| dance 确认链总窗 | 5×1734+2580=11250 | **8×1834+2580=17252** | ≥8×(1684+150)+2280+300=17252（max 8 步；按预估名音上界——注册后实测复核） |
| 错链豁免窗 | 4650 | 4650 不变 | [rbd_wrong,rbd_hint]=1656+150+2544+300（在册键零变化） |
| fix 转场链 | — | [rbd_q_fix] 单段 ≈2.5-3.5s 预估 | queue 异步不占 UI 窗（同常规转场链口径）；实长注册后复核 |
| 教学分账 TUT_SUM | 15748≤16000 | **16148≤16500**（预算上界随 STEP_MS 扩 500） | 教学关 2 步零改动，4 段演示窗 1734→1834 各 +100 |
| waitPhase span | (3200+7*STEP_MS) | **(3200+10*STEP_MS)** | 8 步+2 余量 |
| watch 延 3372 / turn 延 2124 / replay 前导 2124 | 不变 | 不变 | 在册键实长零变化 |

- verify ⑭ 窗数学按本表独立复算（SPEC_DUR 在册 12 键 ±60ms 辨别器**保持**——新 6 键注册后主线
  联动入表+实长回填，段一 TODO 标注）。

## §R9 verify/_selftest/build/pycheck 四方适配（改前 grep `== N` 清点联动）

改前全款 `== N` 计数断言清点：**build.py**（n_clips==15 / TUT_SUM<=16000 / count('nextHint(lim - 1)')==1 /
5*1734+2580>=… / 4650==…）；**game-verify.js**（keys.length===15 / quizzes.length!==CH_LEN /
expBlocks 3|5 / taps===15|20|25 / steps.length===3|4|5 / winDance 11050）；**_probe.py**（无硬计数）；
**_selftest.py**（无 ==N 硬计数）。联动处置：

- **build.py**：n_clips==15 **保持**（manifest 未动，新键注册后主线联动 21）；TUT_SUM 预算 16000→16500
  +分账常量 1734→1834；窗数学断言更新（dance 17252）；新锚：CH1_STEPS 表/U_CAP/NEW_CAP/
  MOVE_POOL 10/fix 结构（engTapSlot 在场/VOICE.fix 在场/disp 渲染分流锚）；RBD_KEYS 清单加 6 新键
  **TODO 注释**（注册前不进断言）。
- **game-verify.js**：① 40 关审计新 structWhy+锚豁免+**fix 聚合分布**（§R6 表全量）；② SPEC 独立表
  重列（POOL 10/SPEC_STEPS 新表/U_CAP/NEW_CAP/fix 律——禁抄页面常量）；③ tapBlock 单元 flat0 q0
  锚断言**原样保留**（3 步 3 块 0 干扰）；**③b 新增 fix 单元**（flat15 驱动至 fix 题：结构+槽 DOM==disp+
  错格 wrong 进度不卡死+豁免窗二错吞+tapSlot(k)=done+确认链 [名音×8,right]+dance log==steps 正确版+
  槽 dance 相位刷新为 steps）；⑦ taps 15/20/25→**21/30/35**（[3,4,4,5,5]/6×5/7×5）；⑨ 布局 simView
  加 flat15（ch4：12 块或 fix 8 槽双形态断言）；⑩ clips 15 键断言保持（新键注册后主线联动）；
  ⑬ 预告新文案对账；⑭ 窗数学新值；⑫ 契约断言加 fix 锚（engTapSlot/fix replay/fix 救援分流）；
  **seg 分段参数**：`?verify=1&seg=k`（k=0..3）①②审计分 4 段（每段 10 关）+固定单元每段全跑，
  无 seg=全量（兼容）；title 注 seg 标记。
- **_selftest.py**：verify 步骤分段跑（seg0-3 串行，每段独立 context+看门狗超时+段耗时报告）；
  real 步骤 taps 21+种档 sound:false（r19 静音纪律补强）；drive flat0-19（fix 题驱动含错点腿）；
  新增 fix 真实点击腿（flat15 全关通关）。
- **pycheck（_r43_pycheck.py 新建）**：mulberry32/shuffled/ri Python 同源复刻+新生成律独立实现，
  40 关 200 题逐字段对拍（steps/anims/k/kq/bad/disp）+§R6 分布断言（HIST OK 行）+flat0 q0 锚与
  r43-baseline.json 逐字节对拍。
- **verify_one_robotdance_r43.py 新建**（现款无 verify_one，主线复验抓手，batch32/ 下）：
  R0 页内自检复跑门+R1 谱约束审计（40 关×5 题 UI 级驱动，Python 独立 SPEC 表：步数/uCap/禁 3 连/
  块多重集+干扰恰 NEW_CAP/fix 律）+R2 覆盖（dch1-4 全现+dch4 每关 fix 恰 1）+R3 确定性双读+
  R4 autoSolve taps 谱（21/30/35/40）+R5 星级（全最优 3★/1 错 2★）+R6 钩子契约（fix 字段/越界/
  新键文案/clips 15/预告表/0 pageerror）+R7 fix 探测（错格 wrong+豁免窗内对选放行）+R8 锚面逐字节+
  R9 重复步防背复核+R10 错链豁免窗（窗内二错吞）——共 10 项 chk。

## §R10 锚面保留清单（逐项核验）

| 锚面 | 保留口径 |
|------|----------|
| flat0 q0 | 旧律产物逐字节（legacyQuiz 独立通道：OLD5 池+旧 rnd 消耗序；pycheck 对拍 baseline） |
| 教学关 genTutLevel | 2 步 jump/clap 零改动（教学链看→帮→独原样） |
| 教学时序链 | watch 延 3372/ghost 2×920/fill 260/60/280/dance 2580 原样（仅演示段窗随 STEP_MS 1834） |
| 教学后真关首题 | =锚面 3 步（verify ⑥ tut:real-q3 断言原样过） |
| 救援双锚 | 14s lastDir 独立/30s lastAct+K 面板守卫+I 链豁免（fix 分流仅换播报键） |
| 存档 | kidsgame_robotdance / sv.robotdance.tutSeen / levels 键全不动 |
| CH_LEN=5 / STATIC_LEVELS=20 / 星级 3-2-1 / mulberry32 种子 823 | 原样 |

## §R11 风险与未验证项（如实）

- **新名音实长未注册未实测**（段一段二间隙）：STEP_MS=1834 按预估上界 1684+150 定；若注册后实测
  max>1684 需调窗（主线裁量）；若 ≤1584 可回调 1734 省演示时长。
- fix 错步位直方图散布阈值（distinct≥4/max≤N/2+1）从均匀掷分布推导+确定性流校准——11 样本小，
  换种子/改生成律首查防假红（r39-bis iv 零裕度同型提示）。
- 关时长上探：ch4 关=4 常规+1 fix≈2.5-3min（演示窗 8×1834 双倍于原 5 步）——审计「35-39s 偏短」
  对症；真机观察弃关率（与 r23/r24 P3 真机项合并）。
- verify 腿时长：现款全量实测基线见 §R12（历史 ~35min 先例）；步数扩容后更长——seg 分段是排程
  必要件（本 SPEC §R9 已落）。
- fix 题「错版静态呈现」不重演错版动画（时长取舍）：孩子靠记忆对比 8 格——若真机找错率畸高
  （>80% 首错），候选=错版逐格 pop 入场演出（每格 200ms 顺序点亮，视觉重演）。
- 8 槽/12 块布局在 ≥800 视口断言过（横 646/竖 566px）；<430 手机竖屏不在家族断言面（r26 m8 同口径）。

## §R12 基线与验收数字（Executor 自测门禁；主线独立复验为准）

| 门禁 | 基线（改造前） | 终态（改造后） |
|------|----------------|----------------|
| build 双跑幂等 | md5 `893d610a866aee0776d6a35e1228b77a` ×2 | 见 §R12.1 回填 |
| VERIFY 双视口 | **实测 0.9min（54s）全绿 302/302**（2026-09-22 本机 3 Executor 并发环境；历史「~35min」先例系当时环境挤压非本款结构性时长） | 分段跑全绿（回填） |
| _selftest | — | 全绿（verify 5 腿+real+drive 20/20，§R12.1） |
| pycheck | — | MATCH 200/200+HIST OK+ANCHOR OK（§R12.1） |
| 谱投影 | r43-baseline.json（3-5 步/0-2 干扰/零重复） | r43-post.json（6-8 步/3-4 干扰/ch3-4 恒重复/fix 11 关） |
| verify_one | 现款无 | 新建 10 项 chk（R0-R10）= **10/10 PASS** |

### §R12.1 终态回填（2026-09-22 段一交付实测）

- 终态 md5：`c346834eee8f403b2f958b21a03e5bf2`（index.html 427743 chars；build 双跑幂等同 md5）
- VERIFY 分段实测（本机 3 Executor 并发环境）：seg0-3 各 **140/140 PASS**（91.8/91.9/91.8/91.8s）
  + 全量腿 **326/326 PASS**（92.3s，含 ②b 聚合分布）——5 腿总 **459.7s（7.7min）**，最慢单元
  =全量腿 92.3s；基线 54s → 终态 ~92s/段（步数扩容+fix 单元+5×固定单元重复跑的代价）。
  **主线复验排程建议：分段 4×~1.6min 或全量 ~1.6min 单跑均可，远低于子进程超时上限**。
- _selftest 全绿：verify 5 腿+real（教学链 done+taps 21+3★+种档 settings.sound=false 保持+0 pageerror）
  +drive flat0-19 20/20（taps 谱 21/30/35/33 全对账——33=4×8 常规+fix 单点 1）
- pycheck：**MATCH 200/200**（Python 位级 mulberry32 复刻 × 引擎谱全字段：dch/steps/anims/
  fix k+bad+disp）+HIST OK 全绿（nHist{'1:3':12,'1:4':26,'1:5':26,'2:6':35,'3:7':45,'4:8':55}/
  dupHist{ch3 恒 1×45,ch4 恒 2×55}/disHist 恒值/kHist distinct=6 max=4 cap=6/kqHist distinct=3）
- verify_one：**10/10 PASS**（R0-R10；R1=40 关×5 题 UI 级全驱独立审计）
- 谱 post 摘要（r43-post.json）：dch1 13 关 n=3-5 dis=0|3 dup=0 / dch2 7 关 n=6 dis=3 dup=0 /
  dch3 9 关 n=7 dis=4 dup=1 / dch4 11 关 n=8 dis=0|4 dup=2 fix=11 关——对照 baseline
  （3-5 步/dis 0-2/零重复/零 fix）三维度全升
- 锚面实证（三落）：pycheck ANCHOR OK（flat0 q0 steps=[wave,jump,clap] blocks=[clap,jump,wave]
  ×baseline 逐字节）+verify audit 锚对拍+verify_one R8——教学链/存档兼容实证在 _selftest real 腿

### §R12.2 修复轮终态（2026-09-22，审查 REPORT-REVIEW-r43 四 major+八 minor 收口）

- **md5 链**：段一 `c346834e…`（427743）→ 段二注册 21 clips `e40ed715…`（524.9K）→ **修复轮终态
  `aba34bcdf9f725c6cb56775e31a9ccad`（517298 chars，双跑幂等；修复轮 M1 渲染分支+注释勘误所致差异）**。
- **M1 fixShow 三分支**：build=disp 全填可点/dance=正确版/**watch 首演=空槽**（disp 不提前泄出）/
  replay=q._replay 期 disp 保留（对比锚不撤，SPEC §R5 明文）——verify 新断言 `fix:watch-empty`
  +`fix:replay-disp` 实跑全过。
- **M2 确认链勘误**：三处注释+主线记录改实测真值——最坏 Σ=12840（flat34 q0）+**8**×150+2280
  =16320，+300=16620≤舞窗 17252 余 632（原「8 步互异 Σ11552+7×150=14882 余 2370」为假数：
  U_CAP{4:6} 下 8 步互异不可能；⑭ est 口径恰等式链不动）。
- **M3**：§R4.5 文字改实际语义（bad=自 bi+1 起环扫首个无 3 连候选——无条件顺移，rnd 流不动）；
  **M4**：verify ⑨ sims 采样加 flat17（12 块最密布局形态原零执行）+minor1 驱动避已消耗块
  （dup 步 findIndex 命中已消耗块停滞——kq 布局耦合同根）。
- minor2-8 收口：stale 窗注释群（1734/1584/11250/15748→1834/1704/11750/16148 实测口径）/
  replay 前导注释勘误（2124>1896 余 228，窗值复用 turn 延不调）/build 增名音 max≤STEP_MS 断言
  （①b）/pycheck 扩 **60 关 300/300**（kHist distinct 6→7）/verify_one 头注+clips 断言 21
  （原锁段一过渡态 15）/minor5 SPEC §R5「题面 pulse」勘误裁定不实现（指向 k=泄底）。
- **全链重门禁（2026-09-22）**：build 双跑幂等 `aba34bc0` + pycheck 300/300 + VERIFY 双视口
  **328/328 ×2**（326+2 新断言，errs=0）+ _selftest 全绿（20/20+taps 谱 33）+ verify_one
  **10/10** + gate_common32 RD **3/3**。
