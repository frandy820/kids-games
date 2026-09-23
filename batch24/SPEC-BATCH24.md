# SPEC-BATCH24 · 5-6 岁三款（形状屋顶 / 描红数字 / 贴纸装扮）契约 v1（2026-09-09）

对象：5-6 岁（启蒙段：零文字依赖、形状辨认、书写前笔顺、角色扮演表达）。目录 `batch24/shaperoof|trace|dressup/`。
结构照 batch1-23：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch23/piano/_src/（逐音比对相位机——trace 锚点接力同构+双模式 free 零判定——dressup 同构）、batch23/weather/_src/（衣物 SVG 资产风格+两件题 hold 状态机——dressup 参照）、batch23/share/_src/（两击制防误触——dressup 参照）、batch11/shadow/_src/（形状配对+干扰池——shaperoof 参照）、batch21/feed/_src/（数词——trace 参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-57 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/错点防重入窗 1000ms/晃动防重入/演示实证/教学 watch ≤16s/连击三纪律/映射真值/对战真值/可解真值/日历真值/记忆真值/题库真值/feed·bubble·bridge·hidden·slide·colormix·weather·share·piano 真值——仅适用项）。**〔家族契约带入（b22-b23 定版，一项违反=审查 Major 起步〕：A. 启动 dayEnd 的 nextHint 传 `lim-1`（§0.4 防跳章——b23 三款启动路径全漏改为 M1，写代码时三处调用点先写对）；B. 救援钟结构=14s 方向级独立节流锚（不得重置 30s 答案级 idle 锚——重置=答案级死代码，b23 weather/share 双实锤；答案级自身节流用独立锚 ≥20s，禁与方向级共享锚——共享会饿死答案级；正确参照=batch23/piano）；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配可见回应（容器 bump）；E. 修复行为收窄时先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]，生成关 GEN_HINTS[k]↔dch=k+1，verify 必带 C7 型关键词断言）〕**

55. **shaperoof 图形补洞真值**（本批新增）：形状**封闭集 8**（circle 圆/square 方/triangle 三角/star 星/heart 心/diamond 菱/semicircle 半圆/trapezoid 梯形——表外不出题）；题面=小兔子房子屋顶缺一块（洞=形状虚线轮廓），下方 4 片形状瓦片（1 对+3 干扰）点选；**无旋转维度**（形状摆放方向固定——旋转是 6-7+ 段能力，本段不做）；点对=瓦片飞入补洞+房子窗户亮灯+小兔子窗口跳（celebrate）；点错=该瓦片摇头+语义反馈（「这块的边对不上哦」——不出现「错了」字样）；每关 5 题；确定性 seeded；**干扰池规则：ch1-2 同集异形任取，ch3 起 3 干扰中必含 ≥1 近形对**（circle↔semicircle / square↔diamond / triangle↔trapezoid——近形对表封闭，verify 断言 ch3 题干近形在场）；星级=错选次数（0=3★/1-2=2★/≥3=1★）

56. **trace 描红数字真值**（本批新增）：数字 **1-10 封闭**；**锚点接力制**（tap 家族内实现，教书写前笔顺）：每数字=标准笔顺**锚点序列**（2-6 锚点，坐标 agent 定，**起点方向性真值**=起点在数字的上部或左部（标准笔顺从上到下/从左到右）；多笔数字（4/5/7/10）分笔=前一笔末锚点亮后短顿再亮下一笔首锚），当前锚点呼吸发亮（breathe 常驻——承 piano 救援视觉），**点对当前锚点=连线延伸到该点+轻音**（Web Audio 短音，每锚点音高递升——do 到 sol 循环），**点错（点非当前锚点）=当前锚点 pulse 重提示+不罚不重头**（piano 逐音比对同构：pos 不回退、miss+1、序列不重头）；全部锚点连完=完整描红线亮起+**数词朗读**（tra_n_<num> clip）+兔子跳（celebrate）——**〔勘误 2026-09-09 审查 M1：queue(tra_right+tra_n) 拼播链的等待窗按 clip 实长取（2280+150+≈1150+余量=4100ms，done/won 两分支同），且教学/演示收束 TTS 不得与链撞头（收束语已删）——原 700ms 窗=hint 的 play._stop 掐断 queue 链（onened→_qtimer 接力被清），数词一次都不播〕**；每关 5 题（每题 1 数字）；确定性 seeded；星级=点错次数（0=3★/1-2=2★/≥3=1★）；锚点命中半径=锚点圆可视半径（幼儿档宽松，≥32px，触摸 ≥64 目标仍守 §0）；**8/9/10 为难点章专属**（锚点数多/含闭合环/两笔），不出现在 ch1

57. **dressup 贴纸装扮真值**（本批新增）：**双模式同构 piano**（任务/自由顶部大按钮切换）；**主题封闭表 6**（去上学=[书包,太阳帽,小挎包] / 运动会=[运动鞋,遮阳帽,小背包] / 睡午觉=[睡帽,睡衣,小熊] / 开派对=[皇冠,蝴蝶结,裙子] / 雨天出门=[雨衣,雨靴] / 冬天出门=[围巾,手套,厚外套]——主题外组合不出题；**贴纸池封闭 19**（6 主题物品并集 3+3+3+3+2+3=17+2 自由装饰：花朵,星星——〔勘误 2026-09-09 交付轮：原文汇总写 18 为算术笔误，以逐项清单为真值〕，表外贴纸不出题）；任务模式：题面=主题场景+语音「去上学，带上什么？」，贴纸栏候选 6-8 片（含 need 全部+干扰），**两击制**（点贴纸选中高亮→点小兔子贴上，share 同构防误触），**need 全贴上才过**（对一件=挂兔子身上可见+轻音，weather 两件题 hold 状态机同构）——**〔勘误 2026-09-09 审查 M2：判对后等待窗按 clip 实长取（dru_right 2664ms→窗 3200，原 620ms 掐 79%）；救援答案级演出期须置 state.demo 门（与教学路径对称）〕**；贴错（非 need）=贴纸弹回+软反馈（「开派对不戴这个哦」——**不否定物品自身属性**，只说场合不合适，承 b23 M3 精神）；celebrate=兔子转圈展示+全场彩花；**自由模式=零判定零写档**（任意贴/点已贴揭下/清空钮/兔子偶发跳，piano free 同构 §0.13 不计步）；每关 5 题；确定性 seeded；星级=贴错次数（0=3★/1-2=2★/≥3=1★）

## §1 shaperoof 形状屋顶（形状辨认+近形分辨）

**玩法**：屋顶缺洞+4 瓦片候选，点对补洞。
- 题型（4 章）：ch1 基础形（circle/square/triangle 轮换，洞大，干扰=三基础形互为）；ch2 扩展形（star/heart/diamond 加入，池=8 全集）；ch3 近形强化（干扰必含 ≥1 近形对，近形对封闭表 3 对）；ch4 生成关混合（含近形题 ≥2）
- 星级：错选次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示点对瓦片飞入（幽灵手指+「屋顶缺了一块」）→帮/独；`__srDemoR`
- 钩子：`SR = { get currentLevel, get quiz(){ shape(洞形状 id), tiles[]({id,shape,right}), step, miss }, tapTile(i), start(flat), autoSolve() }`
- 语音：shr_tut_watch'看！屋顶缺了一块'/shr_tut_turn'你来补一补'/shr_hint'看看洞的形状'/shr_right'补好啦，房子真漂亮'/shr_wrong'这块的边对不上哦'/shr_q'补屋顶咯'（题面）

## §2 trace 描红数字（书写前笔顺+数感；r5 自推笔顺改造 2026-09-13）

**玩法**：数字骨架虚线+锚点依次发亮，逐点点亮连成数字。
- 题型（4 章）：ch1 数字 1-3（2-3 锚点）；ch2 4-6（3-5 锚点，含多笔 4/5）；ch3 7-10（2-6 锚点，含闭合环 8/9 与两笔 10——**8/9/10 不进 ch1**）；ch4 生成关混合（1-10 池）；每关 5 题**相邻互异+出场均匀**（〔勘误 2026-09-09 交付轮：原文「同关互异」在 ch1 池 3/ch3 池 4 数学不可能全互异——5 题>池 3 必有重复，取相邻互异+均匀轮转；ch4 池 10 全互异成立〕）
- 星级：点错次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示点完一个数字的锚点（幽灵手指逐点+「从发亮的点开始」）→帮/独；`__trDemoR`
- 钩子：`TR = { get currentLevel, get quiz(){ num(1-10), anchors[](锚点序号有序数组), pos(当前比对位), step, miss }, tapAnchor(i), start(flat), autoSolve() }`
- 语音：tra_tut_watch'看！从发亮的点开始点'/tra_tut_turn'你来连一连'/tra_hint'点发亮的小圆点'/tra_right'写好啦，真棒'/tra_wrong'回到发亮的点哦'/**tra_n_1..tra_n_10 数词自建副本**（§0.25——完成朗读用）

**〔r5 改造 2026-09-13：本节 v1 玩法/题型/钩子/语音表已升级——题型三族（trace 自推/listen 听数选字/mirror 镜像辨析）、章型与封闭表以 §7 r5 版本块为真值源；tra_hint/tra_wrong 退役（注入保留不播）；新 10 clip 实长见 §7 SPEC_DUR 表〕**

## §3 dressup 贴纸装扮（角色扮演+主题归类）

**玩法**：主题题面+贴纸栏两击制贴到兔子身上；自由模式随便装扮。
- 题型（4 章）：ch1 2 件主题（雨天/冬天出门）；ch2 3 件主题（去上学/运动会）；ch3 3 件主题（睡午觉/开派对）+候选池 8；ch4 生成关混合（6 主题池）
- 星级：贴错次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示贴一件（幽灵手指贴纸→兔子+「给小兔子穿上雨衣」——教学锚=雨天主题）→帮/独；`__drDemoR`
- 钩子：`DR = { get currentLevel, get quiz(){ theme(主题 id), need[](需贴 id 数组), stickers[]({id,theme}), placed[], step, miss }, tapSticker(i), tapRabbit(), mode('task'|'free'), start(flat), autoSolve() }`
- 语音：dru_tut_watch'看！给小兔子穿上雨衣'（〔勘误 2026-09-09 交付轮：原文「戴上帽子」与 ch1 主题池雨天/冬天无帽子错位——教学锚=雨天贴雨衣，文案随演示动作；clip 已重合成〕）/dru_tut_turn'你来装扮它'/dru_hint'再看看要带什么'/dru_right'装扮好啦，真好看'/dru_wrong'现在不用这个哦'/dru_free'自由装扮时间'

## §4 交付与验收（承 batch15-23 流水线）

语音预合成（gen_clips.py 扩 batch24 块：shr_ 6+tra_ 6+tra_n_ 10+dru_ 7=29 条+core games 数组加三款）→ 3 agent 并行（任务书必带：§0 家族契约 A-F 逐条/§0.55-57 真值逐条/钩子参数语义表——**tapX 参数=数组下标 i（tiles/stickers）或锚点序号，禁自创第二套语义**/clips 清单）→ 首单元门禁（gate_common24.py 改参——demo_ok 三款 'right'）→ 独立复验（断言从 SPEC 推导：shaperoof 形状封闭表+近形对在场断言/trace Python 独立锚点序推进模拟+数词朗读对拍/dressup 主题封闭表+need 全贴才过+free 零写档）→ 全量回归 → 两级入口（batch24/index.html 三卡+主入口 69→72 卡）→ 反方审查+5.5 岁试玩 → 修复闭环 → 收官（5-6 段 30/30 满段，总 72/90）

## §5 审查+试玩修复轮记录（2026-09-09）

- 审查 2M+3m 修复 8/8（REVIEW-BATCH24.md）：M1 trace 数词链三场景全丢（done 700→4100/won 补 4100/删收束语）/M2 dressup 判对 620→3200+删撞头收束语/m1 shaperoof 亮卡 620→900/m2 rescueAns 演出 state.demo 门/m3 sayP 死代码删
- 试玩（REPORT-PLAYER-5.5yo-b24.md，shots4/ 34 张）：三款全通关+**救援两级全可达**（14.3/29.7、13.3/29.7、13.3/32.8——家族契约 B 三款落地正确）；排名 dressup>shaperoof>trace；P1/P2 全零
- 登记不修（P3）：dressup 贴对后选中高亮残留；free→task 整关重发（家族级，同 b23 piano）；shaperoof ch1 干扰含扩展形（观察项）；trace 教学交接 hint 被 turn 切（无内容损失）
- 验证链：门禁 3/3×3+定向实证 6/6（E1/E2 链零掐+E3-E7）+全量回归 6/6（_regress24b.log）

## §6 shaperoof 段基线升级改造（2026-09-13，5.5-6.5 幼小衔接——§0.55/§1 中 shaperoof 段作废，以此为准）

家长审计判定形状配对补洞=3 岁级（5.5 岁实测整关净 12.5s），保留「帮小兔子修屋顶补洞」框架，判定层升级为**空间操作+组合+镜像辨向**；trace/dressup 与 core/日历/星级(0错=3★/1-2=2★/≥3=1★，口径=失败尝试总数)/救援两级(14s 方向+30s 答案)/豁免窗均不动。

- **ch1 旋转对位（rot）**：洞=有向 4 形（triangle/arrow/crescent/flag）带朝向 0-3；瓦=4 形全候选，正确瓦初始朝向偏 off∈{1,2,3}（90/180/270°，永不预解）；分离交互=点瓦选中→点「旋转钮」顺时针 90°/次→再点瓦放置；形状对朝向错=放不上+轻抖+sr_rot_hint
- **ch2 镜像辨向（mirror）**：洞∈手性 6 形（3 镜像对：flag↔flagm/bsh↔dsh/bsh 型 b-d 对/fish↔fishm）；干扰必含镜像伙伴；镜像瓦任意旋转都放不上（手性真值：轴+单端侧附件形旋转态与镜像态逐一不同构）+sr_mir_wrong；旋转判定与 ch1 叠加。〔注：delta 原文「左箭头↔右箭头/开口月牙」在 90° 量化旋转下与旋转态重合（非手性，转 180° 即"镜像"），实施改为等意图的真手形对〕
- **ch3 组合瓦（combo）**：洞∈{L,T,Z} 复合大洞（一条虚线外轮廓，凹角显缝）；=两块板瓦拼接（SLABS 封闭 5 型：bar2v/bar2h/bar3v/bar3h/sq2），分解集合唯一（L={bar3v,bar2h}/T={bar3h,bar2v}/Z={bar2h,bar2v}——两两互异防套路）；先放第一块('half')再放第二块('right')，两块都判定；题面语音=sr_combo_hint
- **ch4 混合（dch4）**：三题型轮换（每关各 ≥1+2 随机）；生成关 flat≥20 沿既有 seeded dch=ri(1,4) 家族模式
- **钩子 v2**：`SR = { get currentLevel(含 kind:'rot'|'mirror'|'combo'|'mix'——章级，'mix'=dch4), get quiz(){kind('rot'|'mirror'|'combo' 题级真值), hole, need({shape,dir}|[{shape,dir}×2]), tiles[]{id,shape,right,dir,used}, sel, placedN, step, miss}, tapPiece(i)→'sel'|false, tapRotate()→新dir 0-3|false, tapPlace(i)→'right'|'done'|'half'|'rot'|'mir'|'wrong'|false, start(flat), autoSolve(), get tutorial }`；tapTile 旧口废除
- **星级口径 v2**：失败尝试总数（形状错 wrong/朝向错 rot/镜像错 mir 同计），0=3★/1-2=2★/≥3=1★
- **教学 v2**：演示=点瓦→点旋转钮旋转一次→放置（flat0 题0 锚 rot/triangle/洞dir1/off1 保确定性）；实证 __srDemoR='right'+__srDemoRot=1
- **语音**：新增 sr_rot_hint'转一转，方向要对上洞洞'/sr_mir_wrong'照照镜子哦，方向反过来啦'/sr_combo_hint'这个大洞要两块瓦一起拼'（shr_ 6+core 3 沿用，全款 12 条）；sr_ 前缀 manifest 核过无占用
- **验证链**：game-verify 自检 55/55+verify_one_shaperoof 9/9（Python 独立封闭表+旋转圈数独立复算+手性断言）+gate 3/3（clips n=12）+verify_voice 补 shaperoof 段（原空转假绿）
- **§6 勘误 M1（2026-09-13 r2 审查修复）**：镜像瓦卡上渲染 CSS 角取负——`(SHAPES[shape].mir ? (4-dir)%4 : dir)*90`。根因=瓦 SVG 内是 Flip∘Rot（与洞同序）而外层 CSS 是 Rot∘Flip，二复合差 2×dir×90°（奇 dir=180° 视觉脱节：视觉对准判错/差半圈判对，ch2+ch4 镜像题约 25% 触发）。修复后瓦视觉=Flip∘Rot_t 恒等于洞视觉，视觉对齐 ⟺ t.dir==q.dir 与引擎判定一致。verify ⑯ 单元锁渲染角公式+洞 transform 互斥断言（防回退）；代价=镜像瓦点旋转钮视觉逆时针（镜像世界固有，判定一致性优先）。

## §7 trace 段基线 r5 难度改造（2026-09-13——§0.56/§2 中判定层与题型作废，锚点表/星级/救援两级骨架/家族契约 A-K 沿用，以此为准）

动因=家长审计红款「实测 13.9s/关零决策」（第 6 严重）：锚点逐个发光跟着点=零思考。定版=**自推笔顺+听觉字形映射+镜像辨析**；单关净时长硬指标 ≥40s 且思考占比可证（每题 ≥1 真决策）；描红动作仍是主体验（加思考点非考试）。

- **题型三族（kind 封闭）**：**trace 自推笔顺**——锚点不再逐个发光：ch1(dch1) 1-5 起点+终点（hintMode='ends'：起点呼吸 current+终点静态绿环 endmark）、ch2(dch2) 6-10 仅起点（'start'）；中间锚点=浅虚圆**永不发光**（verify 负向断言 class/animation 缺席），笔序由骨架虚线+已写绿点+亮线自推；**listen 听数选字**——queue(tra_l_q+tra_n_<num>) 念数→4 数字卡→选对进描红（write 相位 start 档）→整字描完判对；**mirror 镜像辨析**——queue(tra_m_q+tra_n)「哪个是正的六」→4 卡=同数字正体+3 变体→选对进描红。选卡期描红板清空（底图数字不泄答案）+#ask 问号板可重听。
- **封闭表**：听数干扰伙伴 **LISTEN_NEAR 6 对**={4:[10],10:[4]（近音 sì/shí）,6:[9],9:[6],2:[5],5:[2]（形近）}，候选=[num]+伙伴（在场必保证）+seeded 补足至 4 后洗牌；镜像目标池 **MIRROR_POOL=[2,3,5,6,9]**（变体在翻转/旋转下有意义的数字；1/4/7/8/0 近对称不入池）；镜像变体**封闭 3+正体**：m=scaleX(-1) 左右镜像/r=rotate(180deg) 倒置（6↔9、2↔5 经 r 实现）/f=scaleY(-1) 上下翻转（倒置 3 经 r/f 呈现），卡 id=数字+后缀，right 指正体。
- **章型与生成**：dch1 trace×5（1-5 轮转，flat0 题0 恒数字 1 教学锚）/dch2 trace×5（6-10）/dch3 listen×5（1-10 轮转）/dch4 固定型序 **[mirror,listen,trace,mirror,trace]**（2:1:2）；生成关 flat≥20 dch=(ch-1)%4+1 循环=四型混排；seed 沿 mulberry32(flat*7919+13)，rnd 消耗序=Python 对拍真值（dch1/2 offset；dch3 offset+逐题 listenCards 补足+洗牌；dch4 mOff,lOff,tOff+逐题）。同型相邻互异（dch4 mirror 对 q0/q3 与 trace 对 q2/q4 互异；跨型允许同数——决策维度不同）。
- **错型方向反馈（不泄答案铁律）**：点错不 flash 正确锚——所点错锚自身 shake；错型分流 engWrongType：**跳笔**（i>pos）→tra_w_wait'这一笔要等一等'；**逆笔**（i<pos）→期望段主轴方向 clip（r5 审查 m-7 定版：期望段=pos→pos+1 段=「接下来要写的段」，逆笔=朝下一锚的反向书写，方向取该段书写方向）（|dy|≥|dx| 竖向 dy>0 down/dy<0 up；否则 dx>0 right/dx<0 left；末锚未点时取最后一段来向）→tra_w_down/right/up/left；选错卡：listen→tra_w_pick'再听一听，是几呀'/mirror→tra_w_mir'转一转，再看看'（卡 shake，miss+1 相位不变）。verify/_selftest 从本规则+§0.56 锚点表独立重算对账（全数字×全 pos×全错点）。
- **相位与判定**：quiz.phase='pick'|'write'（trace 直生 write）；engPickCard 对='right'（→write）/错='wrong'/相位不符 null；engTapAnchor 沿 v1 接力比对（pick 相位 null）；星级口径 v2=失败尝试总数（点错+选错同计）0=3★/1-2=2★/≥3=1★。
- **钩子 r5 契约**：`TR = { get currentLevel{flat,ch,dch,lv,n,step,done,won,miss,stars}, get quiz{kind('trace'|'listen'|'mirror'), phase('pick'|'write'), num, hintMode('ends'|'start'), anchors[](write: [0..n-1] else null), cards[](pick: listen=数字/mirror=数字+后缀 else null), right(pick: 正确卡下标 else -1), pos, step, miss}, tapAnchor(i), tapCard(i), start(flat), async autoSolve()(选卡+逐锚，taps=Σ(1+锚数)), get tutorial, get phase }`；tapAnchor i=锚点序号、tapCard i=卡下标（禁自创第二套语义）。
- **语音 r5（tra_ 15→25）**：新增 10 条（前缀已核无占用）tra_hint2'从发亮的起点开始，想一想下一笔'/tra_l_q'听一听，它是几'/tra_m_q'哪个是正的'/tra_w_pick'再听一听，是几呀'/tra_w_mir'转一转，再看看'/tra_w_wait'这一笔要等一等'/tra_w_down'从上往下写哦'/tra_w_right'从左往右写哦'/tra_w_up'从下往上写哦'/tra_w_left'从右往左写哦'；**SPEC_DUR 实长真值表（浏览器 new Audio onloadedmetadata 实测 2026-09-13，verify ±60ms 断言 8000ms 超时）**：tra_hint2 3912/tra_l_q 2352/tra_m_q 1824/tra_w_pick 2568/tra_w_mir 2424/tra_w_wait 2112/tra_w_down 2040/tra_w_right 2040/tra_w_up 2064/tra_w_left 1992（交叉核 tra_right 2280=§0.56 原值、tra_n_10 1248、tra_tut_watch 3552、tra_tut_turn 1824）；题面必播不受 flat 门（听觉题不播不可解）；听数/镜像题面=queue 链 0.15s 段间停顿。
- **窗常量 r5（四处同步：game-data WIN+game-main 注释+game-verify+build.py 字面 assert）**：WRONG=1000（错点/错选防重入 200+800，沿 v1 家族）/PICK_RIGHT=600（选对卡演出窗：卡 pop+其余淡出；tra_hint2 并发播不锁不空等）/DONE=4100（沿 v1 数词链窗=tra_right 2280+150+tra_n_10 1248+余量）。**estMs 家族不适用**（r5 全 clip 化零 TTS 拼句）。
- **时序分账与 ≥40s 硬指标（r5 审查 m-6 措辞勘误：1200ms/锚为典型决策假设非下界）**：modeled/关=Σ题[Σ锚(1200 自推决策典型值+200 right 窗)+4100 完成窗]（**不含**题面链/选卡决策/选对演出/错窗——只会更长）；**零思考真实下界**≈24.1s/关（每锚 busy 200ms+完成窗 4100×题数，18 锚口径）——低于 40s，硬指标依赖真实思考时长（儿童 dwel 实测属试玩线）；40 关 modeled 最低=dch1（锚和恒 18）45700ms（verify ⑰ 全量断言 ≥40000）；wall-clock 实测（headless 正常页模拟幼儿 dwell 1200ms/锚）：flat1=46017ms/flat5=57593ms（各独立浏览器，≥40s 达标）。
- **救援两级 r5（家族 B 结构不动，内容相位分流）**：14s 方向级=write 已写锚（pos>0 取 pos-1，pos=0 取起点）flash+tra_hint2（不泄下一锚）/pick 重读题面链+卡行 pulse；30s 答案级=write 幽灵手指指下一锚+rescued 红呼吸/pick 指正确卡+rescued；双锚独立节流、动作即清沿 v1。教学 v5 适配：watch 演示沿 v1（flat0 数字 1 两锚，__trDemoR='right'）；帮=仅起点未点时指起点（自推不指下一锚）。
- **看笔顺按钮**：write 相位可用沿 v1（child-initiated 脚手架）；pick 相位禁用（演示会泄答案数字）。
- **验证链**：_selftest 34/34（verify 59/59+Python 独立生成器 40 关全形对拍+错型方向独立重算对拍+布局双 viewport×4 flat 两相位+正常模式主流程/听数流+wall-clock 两关）→ build（28 clips+WIN 字面 assert）→ 姊妹回归 shaperoof 9/9+dressup 12/12 → gate 3/3（nclips=28）。

## §8 dressup 段基线 r10 难度改造（2026-09-14——§0.57/§3 中判定层与题型作废，主题封闭表/星级骨架/救援两级/家族契约 A-K 沿用，以此为准）

动因=审计红款 #27「主题选贴纸=3-4 岁常识（5-6 岁零决策），实测 25.5-35.7s/关，与 weather 同构双胞胎」。定版=**主题冲突池+装备预算+反向排除**三族；单关净时长硬指标 ≥40s（modeled+wall-clock 双断言）；贴纸/主题/换装主体验不动。

- **题型三族（kind 封闭，dch=难度章号 (ch-1)%4+1 循环）**：**conflict 主题冲突池**（dch1）——题面主题与配对主题贴纸混摆（如海滩运动鞋 vs 雨天雨靴），按题面筛选=跨主题干扰筛选负荷；**budget 装备预算**（dch2）——「只能带三样」限 3 件从 6 候选取舍（预算约束规划非全选）；**anti 反向排除**（dch3）——「哪一样不合适」反向题（沙滩别带雪靴，weather r9 anti 同构）排除式判定；**dch4 混合**——三族轮转（seeded 偏移）+2 seeded（每关三族各 ≥1）。生成关 flat≥20 dch=ri(1,4) seeded 沿家族模式。
- **封闭表 r10（全部新增常量）**：**PAIR_OF 对称配对 6 键**={rain↔winter/school↔sports/nap↔party}（conflict 池=主题+配对件混摆，干扰=配对主题件 ≥min(3,配对件数)；budget 干扰=配对件 2）；**MISFIT 错位件表**=每主题 ≥2 件不在主题自身表（school:[睡帽,睡衣]/sports:[睡帽,睡衣]/nap:[雨衣,雨靴]/party:[雨靴,雨衣]/rain:[皇冠,裙子]/winter:[裙子,蝴蝶结]），相邻 anti 题错位件互异（确定性排除法直选）；**BUDGET_THEMES=5**（school/sports/nap/party/winter——rain 2 件不满 3 预算不入）；候选池数 **POOL_OF_KIND={conflict:7, budget:6}**，anti=主题全集+1 错位件（3-4 片）。need 规则：conflict/budget=主题全集（rain 2/其余 3）；anti=[错位件]。铁律沿 §0.57：need ⊆ 封闭表（anti 由 MISFIT 表校验）、候选互异、相邻主题互异、flat0 题0 锚 conflict rain 全 2 件（教学演示沿 v1）。
- **判定 r10**：conflict 两击制沿 v1（sel→贴上 hold/right/wrong 弹回）；**budget 装包无即时对错反馈**（对错件都 'hold' 飞入书包槽——预算取舍核心），**满 3 即检**：全对=right 推进 / 有错=wrong+miss+1+**错件自动退回对件保留**（「放回去再挑一挑」）+槽满引导 full 防御层；**badge 可点揭回**（engPeel/taskPeel，零惩罚解槽——不计数不锁星级）；**anti 单击即判**：点错位件=right/done（good 闪绿+彩花+ADV 窗推进，反馈演出异步不吞返回值），点合适件=wrong（摇头+反向重定向，miss+1）。星级口径=失败尝试总数（贴错+满员检查未过+反向点错同计）0=3★/1-2=2★/≥3=1★。
- **场景渲染分流**：budget=左侧三槽书包（.pack+pack-slots 3 槽，badge 落槽非兔子身，52px 槽位对齐）；conflict/anti=兔子换装 badge 槽沿 v1。
- **时长硬指标（estMs 家族定版四处同步：game-data 源+game-main 注释+game-verify 独立副本+build.py 字面 assert，禁 +300 变体）**：`estMs=n=>n*345+600`；**DECIDE_MS={conflict:6200, budget:7800, anti:5400}**（幼儿决策假设值：冲突池筛选/预算取舍/反向排除）+TAP_MS=430（两击动作）+ADV_MS=3200（推进窗=dru_right 2664 实长+余量）+SW_MS=900；`levelDurMs=Σ题 max(estMs(题面句长),DECIDE[kind])+(anti?0:need×TAP)+ADV +5×SW`；**LEVEL_MIN_MS=40000**——40 关 modeled min=47500@flat10（anti 章下限）；逐题 DECIDE ≥ estMs(stem)（语音窗从不撑时长）。wall-clock 实测（headless 正常页模拟幼儿 dwell=DECIDE 假设值+动作 350ms）：flat1=67353ms/flat7=76818ms（各独立浏览器，3 星零 miss）。
- **钩子契约 r10**：`DR = {…v1 沿, get quiz{kind, budget(他族 null), theme, need, stickers[]{id,theme,right}, sel(选中下标——**两击制外部驱动观测面**，null=未选), placed[], step, miss}, peel(i)(budget 揭回第 i 已装件→id|false), …}`。**勘误 M1（2026-09-14）**：v1 getter 无 sel 字段——外部驱动读 quiz.sel 恒 undefined→「选中」分支死循环 sel/unsel 抖动（wall-clock 313s 卡死根因），补 sel 后驱动正常（33 轮完成 flat1）。
- **救援两级 r10（家族 B 结构不动，内容按族分流——不泄答案铁律）**：14s 方向级=重读题面；conflict 加 need 未贴片 pulse（v1）/ **budget/anti=场景 pulse**（指片即泄答案——预算题指哪件=判哪件对，反向题指片=直接给答案）；30s 答案级=conflict 幽灵手指演示贴一件 / **budget 先揭回一件错件（若有）再演示装一件对件**（帮做不制造 miss）/ **anti 幽灵手指点错位件**（单击即判，演示完成整题）；演示=有效动作重开救援窗沿 v1。
- **章节预告 r10（契约 A/F/M1）**：CHAPTERS={1:'出门装扮'→2:'下次只能带三样，要挑一挑啦'→3:'下次要找出不合适的一样哦'→4:'所有玩法混在一起，大挑战来啦'}；GEN_HINTS（生成关四型）=['相似的装扮混一起，想清楚再贴','只能带三样，挑最需要的','找一找，哪一样不合适','大混搭挑战，想好再动手']；**契约 F 修复 v1 违规**：生成关章末预告禁 (ci+1)%4 字面，须实算 GEN_HINTS[genLevel(f+1).dch-1]（verify ⑮ 字面哨兵实测撞点 f=25 real=0 lit=2——找不到撞点必须 fail 不静默通过）。
- **语音 r10（dru_ 6→9，全款 12 条）**：新增 3 条（前缀已核无占用）dru_budget_hint'只能带三样，放回去再挑一挑'（3576ms）/dru_anti_hint'要找不用带的一样哦'（2376ms）/dru_anti_right'找对啦，它不用带'（2520ms≤ADV 3200 不掐）；budget 满员错检反馈不受 flat 门（核心纠错语义）；anti 错点=dru_anti_hint 反向重定向（不泄答案）。实长=new Audio onloadedmetadata dataURI 实测（file:// URI 返 -1 勿用）。
- **wall-clock 种档铁律（勘误 M2，2026-09-14）**：core store.load 对 v 匹配存档**直接使用不补默认键**（design/core.js 只读）——种档缺 dailyMin → 会话计时器每分钟 save.dailyMin[today] 抛 pageerror（60s 内不触发=插桩盲区）。wall-clock/真实页种档须全结构：{v,game,firstDay,lastDay,levels,dailyMin,settings,restTip,dressup:{tutSeen}}（与 verify_batch24 parent_gate 同款，日期键禁手拼字符串——Python date.today().strftime）。
- **验证链**：build 2b 硬检查（estMs 定版字面/LEVEL_MIN_MS/DECIDE_MS/三族引擎标记/契约 F 实算字面/units.duration+V_MIN）→ _selftest 31/31（verify 61/61：40 关三族审计+durOk 对账+⑰冲突池/⑱预算/⑲反向单元+⑮nextHint 逐点+F 哨兵+⑬布局 6 组 body.port 通道；Python 独立封闭表对拍 40×5；三族真实 UI 流；真实页教学+autoSolve+写档 v1.0；新 clip 实长；wall-clock flat1/flat7）→ verify_one_dressup 16/16（D0-D9：rec 序号化/表结构先验含 PAIR/MISFIT/BUDGET_THEMES/三族状态机 D2a-c/budget 满员才检 D3/三族错击 2★/时长独立对账 40 关）→ 姊妹回归（shaperoof+trace 不退化+verify_voice dressup 12 键+家长门+两级入口）→ gate_common24.py dressup DR 12。
