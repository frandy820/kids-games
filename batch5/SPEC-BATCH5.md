# SPEC-BATCH5 · 5-6 岁三款（数数小鸡 / 找不同 / 连线朋友）契约 v1（2026-09-06）

对象：5-6 岁（当前玩家 5 岁半女孩）。目录 `batch5/countchick|spotdiff|connect/`。
结构照 batch1-4：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。

## §0 共同门禁（历史坑全清单，一项不满足=不收）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；nextHint 参数=flat（非章号）；章末预告=CHAPTERS[ci+1]（刚打完章的下一章）；GEN 文案不带"明天："前缀（core 模板自带）；启动 dayEnd 的 nextHint 传 lim
5. **语音双包装**：`sayP`（仅 flat<3 播）+ **`sayR` 救援（不受 flat 门，if(cur) 即播）**；idle 20s 看护分支必须用 sayR（7 岁半评估 P1 教训：flat≥3 静置零救援）；入场/答错常规提示保持 sayP
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen 记忆）；看=演示（locked 吞输入）→帮=幽灵手指→独=首次答对放手；教学演示内计时循环注意 0 次边界（clock m6 教训：目标=0 时空转）
7. **答错零惩罚**：晃动+灰掉可重点；**首错不 pulse 正确项（q._miss>=2 才高亮**，给再想机会——batch4 评估修）
8. **钩子 getter 返回拷贝非活引用**（tangram 教训）；quiz 取值兼容 getter/方法/属性三形态由验收脚本处理
9. **触摸目标 ≥64px**（SVG 小元素加透明命中外扩——tangram 命中矩形/CSS stroke 不算像素教训）；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0
10. **对比度 WCAG**：正文文字 ≥3:1（getComputedStyle 取色算 relative luminance——batch4 视觉评估四项修复教训）
11. **CSS transition 坑**：元素有 `transition:transform` 时 transform 变更后同步 getBoundingClientRect 量到中途位置——布局断言用纯数学或等 transition 结束再量（tangram 甩飞修复教训）
12. **core 家长门**：弹层类=.k-panel（非 .k-gate）；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（key 缺 clip 自动整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0；首次提示豁免不适用（三款无提示道具则跳过）
15. **布局病害**：文字过早断行/SVG 图内重叠是必犯病害（html-svg 坑）；结构化内容优先 HTML grid/table 而非 SVG 文本

## §1 countchick 数数小鸡

**玩法**：草地场景出现 N 只小鸡（SVG 卡通，颜色/姿态微随机），孩子点数后从 3 个数字大按钮（≥96px）选答案。**点数辅助**：点任何一只小鸡→它跳一下+咯咯声+头顶显示序号角标（1,2,3...递增；再点已数过的跳一下不增号；点"重新数"清零角标）——手口一致点数是 5 岁核心难点，防漏数重数。

- 章 1：1-3 只（大间距）；章 2：4-6 只；章 3：7-10 只（密集，中心距 ≥90px 恒不重叠）；章 4：混入干扰动物（小鸭/小兔 2-4 只）只数小鸡
- 生成：mulberry32；位置撒点防完全重叠（每只中心距 ≥90px 视觉）；干扰动物章 4 才有 2-4 只
- 答案按钮：3 选 1（正确+两个近邻干扰 N±1/N±2，保证非负且互异）
- 星级：答错次数 0=3★ / 1-2 次=2★ / 更多=1★
- 钩子：`CHK = { get currentLevel, get quiz(){n,items,answer,answerIdx,distractors}, tapChick(i), pick(i), autoSolve() }`
- 语音：chk_tut_watch'看！数一数有几只小鸡'/chk_tut_turn'你来数一数'/chk_hint'点一点，数一数'

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

## §2 spotdiff 找不同（小兔子的花园）

**玩法**：上下两幅同场景图（SVG 花园：天空云/太阳/草地/花/蝴蝶/小兔/蘑菇），K 处不同（改颜色/移位/增删元素）。孩子点**下面那幅**的不同处→圈中动画+音效；点空白处轻微摆动零惩罚；全找到过关。

- 章 1：2 处（元素少 6-8 个）；章 2：3 处；章 3：4 处（元素 10-12）；章 4：5 处（元素 12-13）
- 差异类型池：换色（花瓣红→黄）/位移（云左→右）/增删（多一只蝴蝶/少一朵花）/大小（大蘑菇→小蘑菇）；增删类两图元素数不同但布局锚定
- 生成：场景模板+元素随机布局（mulberry32），差异点位最小间距 ≥120px（防一点中俩）；**差异热区命中半径 ≥64px**（§0.9 外扩）
- 找到进度：K 个小圆点亮起；全亮过关
- 星级：错点次数 0=3★ / 1-3=2★ / 更多=1★
- 钩子：`SPD = { get currentLevel, get quiz(){k,diffs:[{x,y,type}...],found:[bool]}, tapDiff(i)/tapAt(x,y), autoSolve() }`（tapAt=按坐标找最近 diff 判定，供真实点击模拟）
- 语音：spd_tut_watch'看！两幅图哪里不一样'/spd_tut_turn'你来点一点'/spd_hint'再仔细看看'

## §3 connect 连线朋友（动物找晚餐）〔r6 难度改造版 2026-09-13——本节 v1 玩法整段作废留档见文末〕

**审计红款 #9**：动物-食物一一对应=3-4 岁配对，难度全在 4 个超纲常识对（5.5yo 全 3★）。
**r6 定版**：从「一对一配对」升级为「多对多集合对应+食性排除推理+食性传递链」，单关净时长 ≥40s 且思考占比可证。

**玩法（逐题制）**：每关 5 题。左卡=题目主体（动物或食物链图），右列=4-5 候选卡；从左卡拖线到候选卡（pointer down→move 实时画线→up 吸附判定，v1 拖线管线全保留：吸附=距卡中心 ≤半宽+32px 防手滑、松手前 near 高亮、拖出取消、错连线弹回零惩罚可重连）。**逐题制为 v1「单 board 一对一」的最小适配**（权衡：多对多集合判定天然以「一只动物的食性集合」为单位出题，逐题聚焦使漏连救援可锚定当前动物；一对一判定+拖线交互+零惩罚机制语义全保留在 ch1 题型中）。

- **食性封闭表 EATS**（动物 12（lib 0-11 与 v1 PAIRS 同序）× 食物 14（lib 0-11 与 v1 同序 + 12 白菜 + 13 苹果 r6 新增 SVG））：
  小兔[萝卜0,白菜12,苹果13] / 小猫[小鱼1] / 小狗[骨头2] / 猴子[香蕉3,苹果13] / 熊猫[竹子4] / 小鸡[毛毛虫5,白菜12] / 绵羊[青草6,白菜12] / 松鼠[松果7,苹果13] / 小熊[蜂蜜8,苹果13] / 青蛙[蚊子9,毛毛虫5] / 小鸟[红果10,毛毛虫5] / 老鼠[奶酪11]（主食在首位=pair 题 need；verify/_selftest 从本表独立重列对账，禁引用引擎常量）
- **归属表**（食物→动物，派生）：苹果=兔猴松鼠小熊(4) / 白菜=兔鸡羊(3) / 毛毛虫=鸡蛙鸟(3)；其余 11 种专属（归属恰 1：萝卜/小鱼/骨头/香蕉/竹子/青草/松果/蜂蜜/蚊子/红果/奶酪）
- **链封闭 3**（食性传递链 5-6 岁简化版，题面只给链不泄答案）：c0 青草→毛毛虫→小鸡 / c1 青草→蚊子→青蛙 / c2 青草→毛毛虫→小鸟；**up 型**=显示 青草→毛毛虫→?（答案=链顶动物；候选干扰全不吃链中段=候选内吃中段者恰 1）/**down 型**=显示 青草→?→小鸡（答案=链中段食物；干扰≠中段≠链底——干扰可为该动物吃的其他食物（如白菜）但不吃过青草=真排除推理，无捷径歧义）
- **章型**：ch1(pair 一对一热身×5)：动物 12 池 seeded 抽 5 同关互异，need=EATS 主食，候选=need+3 干扰(∉EATS)；**flat0 题0 恒 兔→萝卜**（教学锚）/ ch2(set 多对多集合×5)：动物池=EATS≥2 共 8 只（兔猴鸡羊松鼠熊蛙鸟），need=EATS 全集(2-3)，候选=need+2 干扰(∉EATS)，题面「把小兔能吃的都连上」/ ch3(anti 反向排除×5)：动物池=11 专属 owner，need=归属恰 1 的专属食物，**干扰=白菜+苹果+毛毛虫固定 3（归属 3/4/3 全 ≥2=不可秒排除构造保证）**，题面「只有熊猫吃的是哪一个」/ ch4(混出)：[chain,anti,chain,set,chain]（chain=up2+down1 seeded，链 3 题互异）/ 生成关 flat≥20 dch=(ch-1)%4+1 循环
- **判定（连线即逐条提交，连全才对）**：'part' 集合内连对未满（线固定绿+食物挂对勾不消失，不 miss 不推进）→ 连满 need='right' 推进（末题='done' 通关）；**错连**='wrong'（断线+两卡晃动+miss+1+题型方向锚，零惩罚可重连）；重复连已连项/题已完成='fed' 不惩罚；**漏连**=idle 20s 救援 con_less「还差一个，再连一连」（保留继续不算 miss）——season r4 提交三路径的连线制映射
- **错连方向锚（按题型）**：pair/set=con_w_food'它不吃这个哦，再想想' / anti=con_w_share'别的动物也爱吃它哦'（不泄答案） / chain=con_w_chain'想一想，谁会吃掉它'；flat<3 每错必播+flat≥3 10s 节流（r4/r5 家族口径）；首错不 pulse 正确项（连错 ≥2 才高亮，§0.7 保留）
- **题面句/确认句**=动态 TTS 拼句豁免（weather v2 先例，不建 clip；任务语音不设 flat 门）：pair'想一想，小兔爱吃什么'(10-11 码点)/set'把小兔能吃的都连上'/anti'只有熊猫吃的是哪一个'(11-12)/chain up'毛毛虫吃过青草，谁吃掉它'(13)/down'什么吃过青草，被小鸡吃到'(12)；确认 pair/set'小兔吃得饱饱的，真开心'(12)/anti'答对啦，只有熊猫爱吃竹子'(12)/chain'小鸡吃到青草啦'——**全部 ≤13 码点**（verify 句长护栏）
- **时序分账（estMs=n×345+600，b25 家族定版 +600 口径，禁 +300 变体；build.py 静态断言+verify estMs(11)=4395/estMs(12)=4740/estMs(13)=5085 字面复核）**：判对窗=max(880 演出, estMs(确认句)+300)；part 锁窗 560；错连窗 520；题面句不锁输入（听读计入 modeled）；**单关净时长模型 modeled=Σ题[estMs(题面)+(|need|-1)×880+max(880,estMs(确认)+300)]+celebrate 3020——40 关全量断言 ≥40000ms（实测最低 45210ms @flat15）+ 听读占比=ΣestMs(题面)/modeled ≥35%（实测最低 47.8%）**
- **语音**（既有 4 条 key/文本禁改保留注入：con_tut_watch/con_tut_turn/con_hint/con_rev+PAIR_VOICE 7 条知识句机制保留每关 ≤2 次）：**r6 新增 5 条** con_w_food/con_w_share/con_w_chain/con_hint_anti'找只有它一个爱吃的'/con_less'还差一个，再连一连'（gen_clips.py ALL 已登记，manifest 1609→1614）；**SPEC_DUR 实长真值表（浏览器 new Audio onloadedmetadata 实测 2026-09-13，verify ±60ms 断言 8000ms 超时）**：con_tut_watch 2856/con_tut_turn 1824/con_hint 2352/con_rev 3504/con_w_food 2856/con_w_share 2352/con_w_chain 2856/con_hint_anti 2448/con_less 2856/con_pair_panda 2472/con_pair_chick 2520/con_pair_squirrel 2496/con_pair_bear 2736/con_pair_frog 2640/con_pair_bird 2472/con_pair_mouse 2376；救援 20s 按题型选播（set 未满=con_less/anti=con_hint_anti/chain=con_w_chain/其余=con_hint），兔子按钮同源
- **布局（双 viewport 实测定案）**：卡 88-168px 自适配（右列 4-5 卡按 stage 高算，gap 10-14）；链图卡宽=卡×2.4（ch-cell 2 格+ch-arrow 2 箭头+? 圆标，HTML flex 结构非 SVG 文本——§0.15）；中缝=64px（verify 断言 ≥40 线道）；okline getBBox 与 .lab 文字 bbox 严格不相交（线道不遮字，8 关型×双 viewport 实测）
- **星级**：错连 0=3★ / 1-2=2★ / 更多=1★（永不 0，不变）
- **钩子 r6 契约**：`CON.currentLevel={flat,ch,dch,lv,qIdx,nQ,misses,done,won}`；`CON.quiz={kind('pair'|'set'|'anti'|'chain'),dir,animal,chain,base,mid,top,left(左卡 lib；chain=100+链号),pickType('food'|'animal'),need[],picks[],linked[],qIdx,misses,stem,confirm}`；dragTo(a,b)→'part'/'right'/'done'/'wrong'/'fed'/null；autoSolve() 连完当前关
- **verify 单元（13 项全过才 PASS）**：①40 关审计（确定性/章映射/structOk/直驱通关/flat0 锚/dch4 序列 up2down1）②SPEC 独立对账×40 关全题（食性表/链表/干扰构造/不可秒排除独立判/stem 独立重算）③提交三路径 UI 隔离实验（part/wrong/fed/right+anti 错连+chain down 引擎两路径）④渲染冒烟四型关⑤autoSolve flat0+flat15 UI 通关+线端点锚点⑥布局双 viewport×四型（卡 ≥88/中缝 ≥40/线不遮字）⑦clips 19 条注入+SPEC_DUR ±60ms ⑧星级⑨章末预告 C7（CHAPTERS[1-4].hint='一位朋友能吃好几种'/'找只有它一个爱吃的'/'小虫吃过草，谁吃小虫'/'新一轮晚餐大挑战'；GEN_HINTS[k]↔dch）⑩modeled ≥40s+占比 ≥35%+estMs 字面+句长 ≤13 ⑪SPEED=0.12
- **教学（关 1-0 首次，v1 三段制保留）**：watch=演示拖线 兔→萝卜（真实拖线管线+幽灵手指）→帮（指下一该连卡）/独；tutSeen 持久化

**v1 原文（作废留档）**：左列动物右列食物两列各 N 卡（3-6 对按章），从动物拖线到食物一对一吸附判定，全连对过关。配对库 12 对封闭：兔→萝卜/猫→鱼/狗→骨头/猴→香蕉/熊猫→竹子/鸡→虫/羊→草/松鼠→松果/小熊→蜂蜜/青蛙→蚊子/鸟→果子/老鼠→奶酪。钩子 CON.quiz={pairs,leftOrder,rightOrder}。

## 验收门禁（batch-verify 口径，首单元=先交付者全指标过闸才放其余）

- 每款：①?verify=1 title=VERIFY PASS n/n ②无头真实操作通关第 1 关（真实 pointer 事件：connect 必须真实拖拽、spotdiff 真实点坐标）③双 viewport overflowX=0+触摸目标 ≥64px ④离线断言 ⑤截图像素非空白 ⑥钩子齐全 ⑦0 pageerror
- 语音单元：mp3 size≥800B、manifest 对账、verify_voice 专项 PASS
- 停止条件：任款首验 FAIL≥2 停批；语音同类失败连发 3 停批
- 开发 agent 自测要求：无头 playwright 独立 chromium.launch（**绝不 connect 已有浏览器/绝不杀任何浏览器进程**）；自测真实通关后交独立复验

## 参照实现（开发前先读）

- batch2/memory/_src/（点选+翻牌+教学三段标准形态）
- batch4/clock/_src/（pointer 拖拽+SVG 渲染+nextHint/sayR 最新形态）
- batch2/tangram/_src/（SVG 拖动+命中外扩+纯数学布局断言）
