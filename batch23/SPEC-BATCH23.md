# SPEC-BATCH23 · 5-6 岁三款（天气穿衣 / 分糖果 / 碰碰琴）契约 v1（2026-09-09）

对象：5-6 岁（启蒙段：零文字依赖、点数 1-10、生活常识萌芽、音序记忆 2-4 步）。目录 `batch23/weather|share|piano/`。
结构照 batch1-22：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch22/colormix/_src/（点罐即时因果+自动判定+探索不罚——share 参照）、batch21/feed/_src/（定量点选+数词——share 参照）、batch1/kitchen-rhythm/_src/（Web Audio 节奏+听音复现——piano 参照）+ batch11/shadow/_src/（生活物配对+干扰项——weather 参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-54 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/错点防重入窗 1000ms/晃动防重入/演示实证/教学 watch ≤16s/连击三纪律/映射真值/对战真值/可解真值/日历真值/记忆真值/题库真值/feed·bubble·bridge·hidden·slide·colormix 真值——仅适用项）。**〔b23 家族级勘误 2026-09-09 试玩 P2a：救援 30s 答案级可达性=方向级救援不得重置答案级计时锚（14s 方向级若重置救援钟→idle 封顶 ~15s=答案级结构性死代码——b22 hidden 同构、b23 weather/share 双实锤；定版结构=piano 式独立节流锚：方向级 lastDir/lastRescue 与答案级 idle 锚 lastAct 分离，答案级自身节流用独立 lastAns ≥20s——共享锚会饿死答案级）〕。b21-b22 沉淀承用（必做）：①钩子必带 `start(flat)`；②章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]，生成关 GEN_HINTS[k]↔dch=k+1——b22 colormix 曾复发右移错，verify 必带 C7 型关键词断言）；③吞输入轻叮必配可见回应（容器 bump）。b22 补沉淀：④预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；⑤修复行为收窄时先查教学特例（b22 ch1 清缸击穿 flat0 题0 green 教训）。**

52. **weather 天气配对真值**（本批新增）：天气↔衣物映射**封闭表**（晴=太阳帽·短袖 / 雨=雨衣·雨靴 / 雪=围巾·手套·厚外套 / 风=小外套——表外组合不出题）；题面=天气场景动画（雨滴/雪花/太阳/风吹叶）+语音「下雨啦，穿什么？」；衣物卡 4 选（1 件题）或 4 选 2（两件题——雨天=雨衣+雨靴）；**两件题=两件全对才过**（先选对一件=该件挂起勾选态+轻音，两件齐=celebrate；选错件=该卡摇头+语义反馈——**〔勘误 2026-09-09 审查 M3：错配文案口径定版=4 天气×1 条通用，且不得否定干扰物自身属性——wind「起风了，穿这个不暖和」对 snow 保暖物反常识（与「厚外套=雪天保暖」教学直接矛盾）→ 改「刮风啦，穿件小外套正合适」；clip 随文案重合成〕**，不出现「错了」字样）；每关 5 题；确定性 seeded；星级=错选次数口径（0 错=3★/1-2=2★/≥3=1★；两件题中途对一件不重置）。**〔v2 改造 2026-09-13 作废本条真值——家长审计判单条件配对=3-4 岁水平（5.5 岁实测净交互 1.3s/题，换装动画是奖励钩子不是难度；与 batch24/dressup 同构双胞胎），改「多条件组合+温度区间+差异化需求」条件推理路线，详见 §1 v2 定版〕**
53. **share 等分真值**（本批新增）：题面=「N 颗糖果分给 K 只小动物，每只一样多」；交互=点糖（糖飞入当前选中动物的碗）→点动物切换目标碗（或逐点：点糖+点碗两击制——**定版：两击制**，先点糖再点碗，防误触连送）；**〔勘误 2026-09-09 审查 M2+试玩 P2b：判对后等待窗按实测 clip 时长定（sha_right 2880ms→窗 3200）；教学「帮」交接 turn 后 ~2.4s 接力读题面（weather qTimer 同构——首次自己动手前任务句说全）〕**；**自动判定=每碗相等且糖分完**（相等+有剩=未完成，继续分或取回）；**取回=点碗里的糖退回托盘**（零惩罚）；ch3 剩余题=分到每碗相等且托盘剩 <K 颗时「剩下的放小盘」引导出现（点盘子收尾——余数前概念，不超纲：只感知「分不完」不教除法）；动物表情随碗内糖数变化（0=期待/有糖=笑/相等确认=跳）；确定性 seeded；星级=取回次数口径（0 取回=3★/1-2=2★/≥3=1★——探索取回不罚但计数）
54. **piano 音序真值**（本批新增）：**八音盒 C 大调 8 键**（do re mi fa sol la si do′，固定频率表 261.63-523.25Hz，Web Audio 振荡器+包络——家族 §0 既有通道）；两种模式：**自由弹**（任意键出音+彩花粒子，零判定零失败——全龄重玩入口）+**跟弹**（小兔子按序列弹 2-4 音→孩子复现）；**跟弹判定=逐音比对**（弹对=该键亮绿+音；弹错=正确键轻闪提示+序列**不重头**从当前音继续——防挫败定版，承 §0.16 精神）；章：ch1 2 音序列/ch2 3 音/ch3 4 音/ch4 生成混合（含重复音如 do-do-sol）；每关 5 题序列；序列确定性 seeded；星级=弹错次数口径（0=3★/1-2=2★/≥3=1★）；**声音在 verify=1 静音但音名/键位断言走 DOM**（.key.active 类+琴键 id）

## §1 weather 天气穿衣（生活常识+因果配对）

**玩法**：题面天气动画+语音提问，下方 4 张衣物卡点选。选对飞到小兔子身上（兔子换装动画）。
- 题型（4 章）：ch1 单件题（晴/雨各半，2 选干扰=季节错位衣物）；ch2 单件题（雪/风加入，4 卡全季节池）；ch3 两件题（雨天=雨衣+雨靴/雪天=围巾+手套，选满 2 件）；ch4 生成关混合
- 干扰衣物=季节错位（晴天选围巾=「天热戴围巾会出汗哦」）——**干扰文案=表内封闭**（4 天气 × 2-3 错配文案，verify 断言映射完整）
- 星级：错选次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示选雨衣（幽灵手指+「下雨要穿雨衣」）→帮/独；`__weDemoR`
- 钩子：`WE = { get currentLevel, get quiz(){ weather, need[](需选衣物 id 数组), cards[]({id,kind,right}), picked[], step, miss }, tapCard(i), start(flat), autoSolve() }`
- 语音：wea_tut_watch'看！下雨要穿雨衣'/wea_tut_turn'你来选一选'/wea_hint'看看天上的雨'/wea_right'穿得刚刚好，出门啦'/wea_wrong（按错配文案 3-4 条建 clip）

〔**v2 改造定版 2026-09-13（家长审计：单条件配对=3-4 岁水平+与 dressup 同构；保留「看天气穿衣服+换装演出」框架，判定层升级条件推理——与 dressup 差异化=本款走「条件推理」路线）**：
①章型改四型：ch1 `one` 双条件单选（场景+天气→核心 1 件，候选 6 卡，干扰=季节/场景错配——候选中当题天气类唯一）；ch2 `multi` 多条件叠加（「又冷又下雨」=选 2 件，6 卡，**提交制**承 bubble r1：多点=wrong_more 清空重选+miss / 少点=wrong_less 保留继续 / 勾满点「穿好啦」=right）；ch3 `temp` 温度计区间（9 档温度 -5/5/8/12/16/18/24/25/32 → 5 区间，**边界题 8/16/24 必测**，候选中当区间衣物恰=outfit）；ch4 `who`+`anti`+混合（家人差异化=怕冷妈妈梯子升一档/怕热兔子降一档 + 反向题「哪件用不上」+ 夹 one/multi/temp；who=梯子 5 卡唯一正确档，anti=候选中∉场景 used 集恰 1 件、4 卡）；
②真值表（封闭，verify/独立复验分源重列）：衣物池 13 件=羽绒服/手套/雪地靴(snow,zone1)+厚外套/围巾(snow,zone2)+小外套(wind,zone3)+长袖(mild,zone4)+短袖/太阳帽/凉鞋/泳衣(sun,zone5)+雨衣/雨靴(rain,zone0 雨具)——**每件唯一合理区间，禁交叉歧义**；区间 outfit：<0 羽绒服+手套 / 0-8 厚外套+围巾 / 9-16 小外套 / 17-24 长袖 / ≥25 短袖+太阳帽；ch1 行表 9 行（rain+school→雨衣 / rain+puddle→雨靴 / sun+school→太阳帽 / sun+beach→短袖 / sun+swim→泳衣 / snow+school→厚外套 / snow+snowman→手套 / snow+snowwalk→雪地靴 / wind+park→小外套）；ch2 组合 5 组（雨+风→雨衣+小外套 / 冷+雨→厚外套+雨靴 / 晒+热→太阳帽+短袖 / 冷+风→围巾+厚外套 / 雪+堆雪人→羽绒服+手套）；who 梯子=[羽绒服,厚外套,小外套,长袖,短袖]（怕冷 -1 档/怕热 +1 档，温度池 5/8/12/16/18/24 基准档 2-4）；anti 场景 3 个（沙滩 used=短袖/太阳帽/凉鞋/泳衣，堆雪人 used=羽绒服/手套/围巾/雪地靴，游泳 used=泳衣/凉鞋/太阳帽——干扰恰「会用上」）；
③题面=条件区 chips（天气/体感/场景图标/温度大数字/人物头像+怕冷怕热 badge）+场景卡（天气动画/温度计/角色）+TTS 题面句（动态句走 say 兜底）；多件题勾选=绿框+角标勾+衣物飞挂角色 badge；
④星级沿 v1 口径：0 错=3★/1-2=2★/≥3=1★（wrong_more 与单件错选均计 1 错；wrong_less 合法路径不算）；救援两级沿 §0（14s 方向级=按题型 hint clip+条件区 pulse；30s 答案级=下一件应选卡 breathe/勾满=提交钮 breathe）；
⑤教学=ch2 型双条件演示：幽灵手圈注题面两条件 chips→勾雨衣→勾小外套→按「穿好啦」提交 right（flat0 题0 恒锚定 cm0=雨+风，与 wea_tut_watch 文案动作一致）；watch ≤16s；
⑥钩子 v2：`WE = { get currentLevel{flat,ch,dch,step,done,miss,stars}, get quiz(){kind('one'|'multi'|'temp'|'who'|'anti'), conds[]({k:weather/scene/temp/person, v}), picks[](候选衣物 id), need(单件=id 字符串/多件=id 集), picked[], step, miss}, tapCloth(i), tapSubmit()（ch2+多件题）, tapCard(i)（v1 别名保留）, start(flat), autoSolve(), get tutorial }`——返回枚举 tapCloth:'pick'/'unpick'/'right'/'done'/'wrong'/false、tapSubmit:'right'/'done'/'wrong_more'/'wrong_less'/false；
语音句 v2：新增 4 条 hint（wea_multi_hint'两个条件都要想到哦'/wea_temp_hint'看看温度计，几度呀'/wea_who_hint'想一想，谁更怕冷呀'/wea_anti_hint'找一找，哪件用不上'——前缀沿款内既有 wea_，非 wd_）+提交反馈 TTS（less'还差一件，再找一找哦'/more'多选了一件，重新挑一挑哦'）；v1 的 watch/turn/right/hint/w_*/q_* 沿用；ch1 单件错配反馈沿 v1 4 天气 clip。〕

〔**r9 追加定版 2026-09-14（本轮门禁补强——v2 玩法代码已落 09-13，本轮补时长硬断言+契约 F 实算修复+验收登记，任务书=AUDIT-56 行 75 三 delta）**：
①**时长硬断言**（治"净交互 1.3s/题"）：estMs 家族定版 `const estMs = n => n * 345 + 600;`（data 定义/main 注释/verify 独立副本/build 字面四处同步，禁 +300 变体）；单关 modeled=Σ题[max(estMs(题面句码点), DECIDE_MS[kind])]+多件题 SUBMIT_MS 1600+换题 5×SW 900；DECIDE_MS={one 7400/multi 8000/temp 7800/who 8200/anti 7000}（推算锚：v1 实测 4.5s/题（22.6s÷5，演出 1.2s→决策 3.3s）×复杂度比（条件×2×候选×1.5）×0.75 保守折减）；**≥40000ms/关硬断言**（verify 页内独立副本 40 关 min+每关与源模型 levelDurMs 对账+verify_one python 第二副本逐关对账）+认知占比 ≥85% 且逐题 DECIDE ≥ estMs(题面句)——语音窗从不主导，防纯语音窗撑时长（shadow r8 同构先例）；
②**nextHint 契约 F 修复**：生成关章末预告禁 `GEN_HINTS[(ci+1)%4]` 字面 → 实算 `GEN_HINTS[genLevel(f+1).dch-1]`（下一关 seeded dch）；verify ⑬=静态章末 f=4/9/14/19 逐点（M1=CHAPTERS[floor(f/5)+1]）+生成关 f=24/29/34/39 逐点实算+off-by-one 哨兵（非上一章/非下下章/找字面撞点关断言 nextHint 跟实算不跟字面）——verify_one W7 页外第二副本；
③verify_voice 补 weather 段（EXPECT wea_ 16+core 3=19 键+DIRS ../batch23/weather——feed 同款漏登补法，share/piano 段不在本次范围不動）。〕

## §2 share 分糖果（等分启蒙+公平概念）

**玩法**：题面「6 颗糖，分给 2 只小动物，每只一样多」。托盘 N 颗糖，K 只动物各一空碗。点糖→点碗。
- 题型（4 章）：ch1 平分 2 份（糖 2/4/6/8/10）；ch2 平分 3 份（糖 3/6/9/12）；ch3 剩余题（糖 5/7/8/10/11 → K=2/3 各碗相等+剩 <K 放盘）；ch4 生成关混合（含整除+剩余）
- 判定：**每碗相等且糖分完**=celebrate（动物各吃糖动画）；相等+有剩（≥K）=未完成（可继续）；不等=未完成（无错误路径——不均衡不是「错」是「还没分完」）；ch3 收尾=「每碗一样多，剩下的糖放小盘吧」引导+点盘子
- 星级：取回次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示分 1 颗（糖→碗+「一人一颗」）→帮/独；`__shDemoR`
- 钩子：`SH = { get currentLevel, get quiz(){ n, k, bowls[](碗内糖数), tray(托盘剩余), plate(盘内), step, miss(=取回数) }, tapCandy(i), tapBowl(j), takeBack(j, idx), start(flat), autoSolve() }`
- 语音：sha_tut_watch'看！一人分一颗'/sha_tut_turn'你来分一分'/sha_hint'数数每只碗里几颗'/sha_right'每只一样多，真公平'/sha_plate'剩下的放小盘子吧'

## §3 piano 碰碰琴（音序记忆+自由表达）

**玩法**：顶部自由/跟弹模式切换（大按钮）。跟弹=小兔子弹序列（琴键逐个亮+音）→轮到孩子复现。
- 题型（4 章）：ch1 2 音/ch2 3 音/ch3 4 音/ch4 生成混合（含重复音+跨八度 do′）；每关 5 序列；**同章内序列互异**（有序签名互异——重复音款禁同序列）
- 弹错=正确键轻闪 0.5s+该音重听（序列不重头）；弹对=绿亮+彩花；序列完成=小兔子跳舞 celebrate
- 自由模式=零判定（弹任何键=音+彩花+偶发兔子跳）——**不进关卡不写档星级**（纯玩具层，§0.13 日历真值对其不计步）
- 星级：弹错次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示跟弹 2 音→帮/独；`__piDemoR`
- 钩子：`PI = { get currentLevel, get quiz(){ seq[](音名), pos(当前比对位), step, miss }, tapKey(name)——比对/自由模式直接发声, mode('free'|'follow'), start(flat), autoSolve() }`
- 语音：pia_tut_watch'看！兔子弹什么你弹什么'/pia_tut_turn'你来弹一弹'/pia_hint'先听兔子弹哦'/pia_right'弹对啦，真好听'/pia_wrong'再听一次这个音'（音名不 TTS——音本身即反馈）

## §4 交付与验收（承 batch15-22 流水线）

语音预合成（gen_clips.py 扩 wea_ 5+错配文案 3/sha_ 5/pia_ 5 中文句——约 18 条+core games 数组加三款）→ 3 agent 并行（任务书必带：start(flat) 必带/hint=预告下一章+GEN_HINTS[k]↔dch=k+1/吞点 bump/§0.52-54 真值逐条/预置存档 v1.0 教训）→ 首单元门禁（gate_common23.py 改参——demo_ok 集合加 weather 'right'/share 'right'/piano 'right'）→ 独立复验（断言从 SPEC 推导：weather 映射表封闭对账/share 等分 Python 独立判定+pia 频率表+序列互异断言）→ 全量回归 → 两级入口（batch23/index.html 三卡+主入口 66→69 卡）→ 反方审查+5.5 岁试玩 → 修复闭环 → 收官（5-6 段 27/30，总 69/90）
