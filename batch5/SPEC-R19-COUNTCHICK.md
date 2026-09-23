# SPEC-R19-COUNTCHICK 数数小鸡〔r19 难度改造〕

> 2026-09-19 从 SPEC-BATCH5.md §1-r19 抽出独立档案（r19 审查 m5：家族 SPEC 检索一致性——与 memory 的 batch2/SPEC-R19-MEMORY.md 同级形态；原段留档不删）。

## §1-r19 countchick 数数小鸡〔r19 难度改造版 2026-09-18——AUDIT-56 黄款 #7：点数 1-10+干扰=4-5 岁技能低 1.5 岁（5.5yo 全 3★），§1 v1 量域/章型整段升级，6-7 岁目标；原 §1 留档〕

**审计 delta 定死（三项不可砍）**：①量域 11-20（「先数 10 再数余数」十加几结构化教学法锚）②两群比较（小鸡比小鸭多几只/少几只——从数单群升级群间比较）③限时快数（感数上限外的短时呈现估计）。CH_LEN=5 / 静态 20 关 / 键基 c-[0..4] **不变**（无迁移面，新增存档脏键守卫 IIFE：非 `^(\d+)-(0-4)$` 键=levels 清空重上教学）。

**章型与数学先验**：
- **ch1 数到十几（count）**：11-14 只纯点数；**十加几锚**=数到第 10 只出 ten-chip「满 10 啦」+播 chk_ten（一次，不锁输入），继续数变「10 + k」实时更新——先数 10 再数余数（ten-plus 结构化教学法，KG/G1 make-a-ten 前概念）；撒点 D=96/size 78
- **ch2 数到二十（count+mix）**：15-20 只 + 混入小鸭/小兔 2-4 只只数小鸡（原 ch4 技能并入新量域）；D=90/size 70（×0.94 抖动后热区 ≥64 推导：size ≥68.1）
- **ch3 两群比较（compare）**：小鸡 n∈[7,12] 恒为多的一方，小鸭 m=n−diff，**差值域 diff∈[1,5]（可答域先验：1-5 全覆盖，m≥2 恒成立）**；问法两向随机（more=「小鸡比小鸭多几只？」/less=「小鸭比小鸡少几只？」——clip 封闭两句，答案同为 diff）；tally 双群并排（小鸡/小鸭各自清点计数 live 显示）+两群角标各自独立（小鸭蓝灰描边）；**防数格子捷径=双群同一 scatterPts 随机撒点（无行列结构）**；答案 3 选=diff+diff±1/±2 干扰（非负互异）；D=92/size 70
- **ch4 看一眼快数（flash）**：n∈[8,16] 短时呈现估计；**呈现窗公式 flashMs=1200+n×100**（n=8→2000ms / n=16→2800ms）；**感数上限依据**：感数（subitizing）上限 4-5，8-16 已在其外必须估计；**判分口径**：窗 < 点数下界（逐格点数 ≥600ms/只 → 8 只 ≥4.8s ≫ 2.0s，窗内数不完≠猜错=设计本意，估计任务保真），选项间距 3（N−3/N/N+3）→ 估计落在 ±1.5 内唯一映射正确项；呈现期点数/答题全吞（bump+轻叮）；「再看一眼」重播同窗长（零惩罚不限次，重播仍数不完）；D=96/size 78
- 相邻题关键量互异（count/flash=n 互异；compare=(n,diff) 对互异）；生成关 flat≥20 dch=(ch-1)%4+1 循环；答案分布三位置均出现、首位 <60%（verify 断言）
- **星级**：retries 0=3★ / ≤2=2★ / 更多=1★（永不 0，不变）

**DECIDE_MS 认知时长模型（§4，verify+selftest+build 三方钉死精确一致禁约数；python 独立复算=_src/_model_calc.py）**：TAP_MS=950（逐只点数抬手+角标确认）/COUNT_BASE=2600（读题+选项扫描）/CMP_BASE=4200（双群清点后比较思考，向上数射策略）/FLASH_BASE=3000（估计决策）/RIGHT_MS=880（答对演出窗）/GAP_MS=600/INTRO_MS=3415=estMs(chk_hint)+400/QWIN_CMP=3660=estMs(cmp 问句)+300/QWIN_FLASH=4005=estMs(flash 问句)+300；DECIDE_MS={count:2600+950n, compare:4200+950(n+m), flash:3000+flashMs}；**modeledMs(flat)=INTRO+Σ(问句窗+DECIDE+880+600)；modeled(0)=81765（flat0 ch1 ns=[13,12,13,12,11]）；0-39 全域 min=56840（flat18 flash 关）；max 138465**。

**时序与语音窗（estMs=s.length×345+600 家族 T 全字符口径四方同步；estMs 吃字符串禁传 .length——r18 坑④）**：错链豁免窗（契约 I，b29 坑②按题型实际链构成独立硬编码）WRONG_WIN={count: estMs('点一点，数一数')+150+300=3465, compare: estMs('先数小鸡，再数小鸭')+150+300=4155, flash: estMs('别急着数，看一眼猜一猜')+150+300=4845}（estMs 上界口径：clip 合成后实长恒 ≤estMs，窗安全）；窗内错点吞（不 shake 不计 retries，_miss 仍累计保 pulse 提示通道——verify_one ⑩ 二错 pulse 口径兼容）/对选放行；flat≥3 错反馈 10s 节流（契约 J）；救援双锚 14s 方向级（指向第一只没数的/再看一眼按钮，不泄答案）/30s 答案级（正确项 pulse）（契约 B）；救援让路守卫=错链窗内 return（契约 I）；面板在场守卫（契约 K）。

**语音（旧 4 条保留：chk_tut_watch/chk_tut_turn/chk_hint/chk_rec；数字一律不入口播=无中文数字映射表需求（b27 坑③不适用——角标/十加几 chip 全视觉承载））r19 新 6 条（主线 gen_clips ALL 已合成 2026-09-20，manifest 2244；build/verify 定值 13=core3+旧4+新6，缺任一=断言拦截）**：chk_ten'满10只啦，接着数'(9 字)/chk_cmp_more'小鸡比小鸭多几只'(8)/chk_cmp_less'小鸭比小鸡少几只'(8)/chk_cmp_hint'先数小鸡，再数小鸭'(9)/chk_flash_q'看一眼，有几只小鸡'(9)/chk_flash_hint'别急着数，看一眼猜一猜'(11)。compare/flash 题面问句每题 sayR（无 flat 门——不识字孩子靠它做题，P2 教训）。

**教学（关 1-0 首次，看-帮-独三段保留）**：watch=幽灵手指点**前 4 只**小鸡→演示选答案（11-14 只全演示超耐心窗；十加几锚留"帮"阶段真数触发）；帮=指向下一只没数的；独=首次答对放手；tutSeen 持久化（sv.chk.tutSeen）。

**钩子 r19 契约（verify_one 共享 driver 兼容面保留：CHK.quiz.{items,answerIdx}/CHK.pick/CHK.currentLevel.{step,done,won}/.animal[data-k=c]/.badge/.opt[data-i]/pointerdown）**：`CHK.quiz={type('count'|'compare'|'flash'),n,m,diff,dir,items,answer(=n|diff),answerIdx,distractors,step,chicks,ducks,others,counted,countedD,badges,badgesD,flashMs,flashing,resees,ten}`；tapChick(i)/tapDuck(j)/tapOther(j)/recount()/resee()/pick(i)/start(f)/modeled(f)/autoSolve()/get tutorial。

**verify（独立第 4 script 块，E-M2；源码契约扫描读 querySelectorAll('script')[2] 高风险串拼接；墙钟 <100s 实测 ~15s——r18 坑②无需放宽外部预算）**：①40 关全量审计（确定性/章域规则/structOk/相邻互异/三题型引擎直驱 0 重试 3 星）②count 单元（角标递增/重数/非法下标/十加几 chip 三态）③compare 单元（tally/小鸭组/吞错窗）④flash 单元（呈现期吞/遮盖/再看一眼/窗公式）⑤布局双 viewport×三 flat（热区 ≥64/答案 ≥96/中心距 ≥90/ox≤0）+scatterPts 确定性⑥契约源码扫描（A/F/D/E/I/J/K）⑦clips 前缀封闭⑧estMs 动态+WRONG_WIN⑨modeled 双钉 81765/56840⑩分布⑪UI 冒烟三型关。**_selftest**（三层音频静音+r18 坑① STUB 词法回退）：verify/2a 角标+十加几+吞错+真实通关 2★/2b 教学链/2c compare 真实通关/2d flash 真实页时序/2e 生成关 42 限+家族 F 实算/2f 守卫三例（合法保留+脏键重置+损坏重置）/P1b 双 viewport+PORT-CLS 竖屏通道等价（横 132=port 类 150=真竖 150）/S1 sayW 三态+flat0 对照/S2 救援双锚 14s/30s/离线+0 pageerror+0 发声。

**PORT-CLS 竖屏双通道**（@media(orientation:portrait) 与 body.port 逐行全等 4 行，build 断言）：.opt 150×104 字 50 / #prompt-chip .big 30 / #ten-chip 26×56 / .tally .t 20。
