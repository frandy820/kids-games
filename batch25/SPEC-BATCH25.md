# SPEC-BATCH25 · 6-7 岁三款（故事排序 / 情绪脸谱 / 动物家园）契约 v1（2026-09-09）

对象：6-7 岁（幼小衔接段：叙事顺序理解、社交情感萌芽、自然分类）。目录 `batch25/story3|emo|habitat/`。
结构照 batch1-24：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch24/shaperoof/_src/（4 候选卡点选+封闭集+语义错配反馈——三款主参照）、batch24/trace/_src/（逐位比对不重头+queue 拼播链窗 4100 定版）、batch23/weather/_src/（语义反馈不否定物品属性+hold 状态机）、batch21/feed/_src/（6-7 段年龄基调参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-57+58-60 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b24 定版，一项违反=审查 Major 起步〕：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)` 与启动等价=b23/b24 定版）；B. 救援钟双锚：14s 方向级独立节流锚（不得重置 lastAct；答案级自身节流独立锚 ≥20s 禁共享——共享饿死答案级）；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]，生成关 GEN_HINTS[k]↔dch=k+1，verify 必带 C7 型断言）；G. **queue 拼播链后的等待窗=链总实长+余量（b24 M1：_stop 清 _qtimer 使 onended 接力失效——链后续段一次都不播）；教学/演示收束 TTS 不得与链撞头**；H. 判对/奖励 clip 后等待窗按实测 clip 时长+300ms 余量（b23-b24 三型截断雷：share 2880/dru_right 2664/tra_right 2280——**clip 实长在 build 前用 python 量化写入任务书，禁拍脑袋**）〕**

58. **story3 故事排序真值**（本批新增）：**三格漫画排序（点击制）**——题面=「按顺序讲讲这个故事」+3 张乱序帧卡；**逐槽点击**：点第 1 张（对=飞入槽 1+轻音+「对啦」短反馈；点错（非当前槽正确帧）=该卡摇头+语义反馈（「这一步还不是开头哦」/「这一步已经讲过啦」——按所点帧的正确位给方位语义，不出现「错了」）+miss+1，槽位不清已对的）；三槽全对=故事完整亮起+整串复述（「先…然后…最后…」TTS 拼句）+celebrate；**故事库封闭 ≥12 故事×3 帧**（每故事 frames=[首,中,尾] 正确序固定，出题乱序呈现确定性 seeded；同故事帧互异可视觉分辨）；章：ch1 生活 routine（起床→刷牙→上幼儿园类）；ch2 自然因果（种子→发芽→开花类）；ch3 时间线（早/中/晚+先再后）；ch4 生成混合（全库池）；每关 5 题；确定性 seeded；星级=错点次数（0=3★/1-2=2★/≥3=1★）

59. **emo 情绪脸谱真值**（本批新增）：**情境→情绪配对**——题面=情境场景图+语音情境句（TTS 拼句——情境文案开放式不入封闭 clip 集，**豁免 §0.24 题面 clip 化**，SPEC 明示）；候选=4 张表情脸（每张=眉毛/眼睛/嘴组合的表情 SVG）；选对=该脸放大跳+情绪词朗读（emo_w_<词> clip）+情境确认句（「冰淇淋掉了，小兔子很难过」TTS）；选错=摇头+**不否定人格的引导反馈**（「再看看小兔子发生了什么呀」——不说「你错了」不说「你不该开心」）；**情绪集封闭 6**：happy 开心/sad 难过/angry 生气/scared 害怕/surprised 惊讶/worried 担心；**情境-情绪映射封闭表 ≥20 情境**（每情境唯一答案情绪；干扰脸=其余情绪随机 3）；章：ch1 基本四情绪（happy/sad/angry/scared 各情境）；ch2 加惊讶/担心；ch3 近情绪辨析（干扰必含 ≥1 近情绪对：sad↔worried / angry↔scared 封闭两对——情境文案须有区分线索）；ch4 生成混合；每关 5 题；确定性 seeded；星级=错选次数（0=3★/1-2=2★/≥3=1★）

60. **habitat 动物家园真值**〔**r4 难度改造版本块（2026-09-13，本条 v1 原文整段作废——审计红款：6-7 岁段「小鱼住池塘」=3-4 岁绘本常识，纯知识配对无推理层，单关净时长 45s 大头是动画。r4 定版真值：玩法框架保留（题面卡+4 候选卡点选+确定性 seeded `mulberry32(flat*7919+13)`+星级 0/1-2/≥3→3/2/1★+近环境对封闭沿用），判定层升级为习性/食物链推理六族题型**——**home** 动物找家（v1 玩法原样：ch1 底座+ch4 混出，flat0 题0 恒 fish→pond 教学锚，ch1=常见池 6 动物+常见环境 4 全集，ch4=全 24 池+近环境对必在场）/**feed** 食物链方向：「小兔子爱吃什么？」候选=食物 6 封闭 grass 青草/meat 肉/bug 小虫/fish 小鱼/fruit 果子/candy 果冻（**傻干扰恒在场**），答案=动物 food 标签（18 种 food≠null 动物出题；hen/pig/snake/turtle/fish/duck 6 种不做 feed 题面），dch1 三题食物全互异/**chain** 链式推理：题面=基食物→链中动物→?（up 答案=链顶）或 基食物→?→链顶（down 答案=链中），**链封闭 4**：草→兔→鹰 c1/草→斑马→狮 c2/虫→蛙→蛇 c3/果→猴→虎 c4，干扰=链外动物且禁链成员、up 型禁 food==base（防草食动物双正确歧义），**答案永不进题面**/**hib** 冬眠判断两向：「冬天要睡长觉的是谁？」（sleep 答案∈冬眠集，干扰全不冬眠）「谁冬天不睡长觉？」（awake 答案∉，干扰全冬眠），**冬眠集封闭 4**={bear,snake,turtle,frog}，题面=冬夜雪地+月牙 Zzz 无动物/**struct** 结构-功能推断：「脚上有蹼的动物会什么本领？」题面=特征特写图标（无动物），**特征封闭 4**：蹼足 web→游泳 swim/翅膀 wing→飞 fly/长腿 legs→跑得快 run/尖爪 claws→挖洞 dig，候选=能力 4 全集/**dual** 多条件交集（ch3 核心）：「既会游泳又要冬眠？」题面=两枚条件芯片（无动物），候选=双满足答案恰 1+只满足 A+只满足 B+双不满足（**双干扰必在场**，照 shapecount r3 ⑱ 先例），**交集对封闭 5**：swim∧hib/water∧nowegg/hib∧egg/swim∧egg/farm∧herb（谓词独立于引擎），dch3 五对全覆盖+答案全局互异（小池升序贪心分配：farm_herb 池 1 最先、swim_egg 池 4 最后，任意分配序池恒非空手验）；**动物封闭表 24**（v1 15+新 9：bear/snake/turtle/fox/eagle/duck/squirrel/cow/tiger），标签 [home,diet(herb|carn|omni),hib,swim,egg,fly,food]：fish[pond,carn,0,1,1,0,-]/frog[pond,carn,1,1,1,0,bug]/bird[sky,carn,0,0,1,1,bug]/hen[farm,omni,0,0,1,0,-]/pig[farm,omni,0,0,0,0,-]/rabbit[forest,herb,0,0,0,0,grass]/lion[grassland,carn,0,0,0,0,meat]/elephant[grassland,herb,0,0,0,0,grass]/zebra[grassland,herb,0,0,0,0,grass]/monkey[forest,omni,0,0,0,0,fruit]/woodpecker[forest,carn,0,0,1,1,bug]/dolphin[ocean,carn,0,1,0,0,fish]/whale[ocean,carn,0,1,0,0,fish]/camel[desert,herb,0,0,0,0,grass]/scorpion[desert,carn,0,0,1,0,bug]/bear[forest,omni,1,0,0,0,fish]/snake[grassland,carn,1,0,1,0,-]/turtle[pond,omni,1,1,1,0,-]/fox[forest,carn,0,0,0,0,meat]/eagle[sky,carn,0,0,1,1,meat]/duck[pond,omni,0,1,1,1,-]/squirrel[forest,herb,0,0,0,0,fruit]/cow[farm,herb,0,0,0,0,grass]/tiger[forest,carn,0,0,0,0,meat]（verify/_selftest 从本文字独立重列对账，禁引用引擎常量）；**章型**：ch1 谁吃什么 [home×1+feed×3+chain×1]/ch2 冬天的秘密 [hib,struct,hib,struct,hib 掷向]（hib 两向都有+struct 特征互异）/ch3 两个条件 [dual×5 五对全覆盖]/ch4 大挑战 [home+feed+chain|struct 掷+hib+dual]；**无捷径铁律（两读法分叉点）**：hib/struct/dual 题面零动物显示（verify DOM 断言 .animal-slot 不存在+data-animal=''）、chain 题面显示链中成员≠答案（up 显 mid 隐顶/down 显 top 隐中）；**推理占比可证**：非 home 题/关 dch1=4/5、dch2 与 dch3=5/5、dch4≥4/5；**错反馈**：home=hab_w_<所点环境>（沿 v1 绑定所点环境），新题型=hab_w_<题型>（feed/chain/hib/struct/dual 绑定题型非所点候选），flat<3 每错必播+flat≥3 10s 节流沿 v1；**提示按题型选播** hab_hint_<kind>（home=hab_hint，兔子按钮/空白探索共用）；**语音新增 10 条** hab_hint_{feed,chain,hib,struct,dual}+hab_w_{feed,chain,hib,struct,dual}（hab_ 11→21+core 3=24 clips 注入）；**SPEC_DUR 实长真值表（浏览器 new Audio onloadedmetadata 实测 2026-09-13，verify ±60ms 断言 8000ms 超时）**：hab_tut_watch 3144/hab_tut_turn 1776/hab_hint 2256/hab_right 2544/hab_w_forest 3936/hab_w_grassland 3696/hab_w_ocean 4200/hab_w_desert 4440/hab_w_pond 3696/hab_w_sky 3528/hab_w_farm 4176/hab_hint_feed 2280/hab_hint_chain 2640/hab_hint_hib 2664/hab_hint_struct 2712/hab_hint_dual 2544/hab_w_feed 2016/hab_w_chain 3024/hab_w_hib 3168/hab_w_struct 2592/hab_w_dual 3384；**时序分账**：确认句全 ≤15 字（home 15=v1 界，新题型 ≤14；15 字 SAPI 实测 4899ms）→ 判对演出窗 1800+3600=5400≥4899+300；错窗 1000ms 防重入（w 系 clip 2016-4440 可被对选打断=容忍，沿 v1 口径）；watch 3144→演示 tap 延 3444/turn 1776→读题延 2100/celebrate 2620+400≥2544+300 不变；**布局**：题面卡按题型增高 chain/hib/struct/dual 桌面 210px/竖屏 186px（home/feed 沿 v1 184/168），q-text 可换行（chain 题面 3 行）与题面图形 bbox 严格不相交（双 viewport 实测定案）；**钩子 r4 契约**：HB.quiz 增 kind（home|feed|chain|hib|struct|dual）/animal（新题型 null）/near（home）/chain{base,mid,top,dir}/hibDir/feat/conds{a,b}，候选空间随 kind 切换（scenes[].kind=环境|食物|动物|能力 id；判定 scenes[i].kind===q.home 通用不变）；**点对动画**：home/feed=主体动物飞入所选卡（flyAnimal），chain/hib/struct/dual=星星 pop 进卡（starCard——题面无主体动物）**〕 v1 原文（作废留档）：**动物→环境配对**——题面=动物出场（动画+「小鱼的家在哪里？」）；候选=4 张环境场景卡（森林/草原/海洋/沙漠/池塘/天空/农场 封闭 7 环境）；选对=动物跳进场景（动画）+确认句（「小鱼住在池塘里，游来游去」TTS 拼句）；选错=场景摇头+**语义反馈不否定动物**（「小鱼不能住在沙漠里哦，沙漠里没有水」——按「动物需求 vs 环境特征」给解释）；**动物-环境封闭表 ≥14 动物**（每动物唯一主环境：鱼/青蛙→池塘，狮子/大象/斑马→草原，猴子/啄木鸟→森林，海豚/鲸→海洋，骆驼/蝎子→沙漠，小鸟→天空，母鸡/小猪→农场——**近环境对封闭**：池塘↔海洋 / 草原↔沙漠 / 森林↔农场 三对，表内可辨析）；章：ch1 常见动物（兔/鱼/鸟/母鸡类）；ch2 野生动物（狮子/大象/猴/海豚）；ch3 近环境辨析（出题动物的环境必有三对之一为干扰——verify 断言近环境干扰在场）；ch4 生成混合；每关 5 题；确定性 seeded；星级=错选次数（0=3★/1-2=2★/≥3=1★）

## §1 story3 故事排序（叙事逻辑+顺序词）

**玩法**：3 乱序帧卡+3 槽位，逐槽点击正确帧。
- 题型（4 章）：ch1 生活 routine / ch2 自然因果 / ch3 时间线（先-再-后 时间词在反馈中点名）/ ch4 生成混合
- 反馈语义：点错按帧正确位给「还不是开头」/「已经讲过啦」方位提示（槽位不清已对）
- 星级：错点次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示排完一个故事（幽灵手指逐槽+「先看第一张」）→帮/独；`__stDemoR`
- 钩子：`ST = { get currentLevel, get quiz(){ story(故事 id), frames[]({id, pos(0-2 正确槽), placed}), slot(当前待填槽 0-2), step, miss }, tapFrame(i)——i=帧卡下标, start(flat), autoSolve() }`
- 语音：sto_tut_watch'看！先找第一张'/sto_tut_turn'你来排一排'/sto_hint'想想先发生了什么'/sto_right'故事讲完啦，真好听'/sto_w_first'这一步还不是开头哦'/sto_w_mid'这一步已经讲过啦'（错点反馈=当前槽语义：槽0 错=first 文案，槽1/2 错=mid 文案——**两文案对应当前槽位非所点帧**）/复述句 TTS（先…然后…最后…）

## §2 emo 情绪脸谱（社交情感+情绪词）

**玩法**：情境图+语音情境句，4 表情脸选对。
- 题型（4 章）：ch1 基本四情绪 / ch2 六情绪全池 / ch3 近情绪辨析（sad↔worried、angry↔scared 干扰必含近对之一）/ ch4 生成混合
- 表情脸=SVG 五官组合（同一脸型基座+眉/眼/嘴变体——同脸不同情，禁用颜色/装饰代替表情）
- 星级：错选次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示选对一次（幽灵手指+「看看小兔子的脸」）→帮/独；`__emDemoR`
- 钩子：`EM = { get currentLevel, get quiz(){ scene(id), emo(正确情绪 id), faces[]({id,emo}), step, miss }, tapFace(i), start(flat), autoSolve() }`
- 语音：emo_tut_watch'看！小兔子怎么了'/emo_tut_turn'你来选一选'/emo_hint'再看看发生了什么'/emo_right'你说对啦，抱抱小兔子'/emo_w_<happy|sad|angry|scared|surprised|worried> 情绪词 6 条（选对朗读）/emo_wrong'再看看小兔子发生了什么呀'；情境句 TTS 拼句（game-data 内文案）

## §3 habitat 动物家园（自然分类+环境特征）

**〔r4 改造 2026-09-13：本段 v1 玩法/钩子/语音表已升级——题型六族（home/feed/chain/hib/struct/dual）、章型与封闭表以 §0.60 r4 版本块为真值源；钩子契约 quiz 增 kind/animal(null)/near/chain{base,mid,top,dir}/hibDir/feat/conds{a,b}；语音 hab_ 11→21（新增 hab_hint_<kind> 5+hab_w_<kind> 5，实长见 §0.60 r4 SPEC_DUR 表）〕**

**玩法**：动物出场+4 环境卡选家。
- 题型（4 章）：ch1 常见动物 / ch2 野生动物 / ch3 近环境辨析（池塘↔海洋 / 草原↔沙漠 / 森林↔农场 三对封闭——出题动物环境的三对干扰之一必在场）/ ch4 生成混合
- 语义反馈按「动物需求 vs 环境特征」解释（错选场景 x+动物 a → 反馈=a 在 x 的不适理由，封闭反馈表按环境 7×特征一句）
- 星级：错选次数（0=3★/1-2=2★/≥3=1★）
- 教学：watch=演示送小鱼回池塘（幽灵手指+「送它回家」）→帮/独；`__hbDemoR`
- 钩子：`HB = { get currentLevel, get quiz(){ animal(id), home(正确环境 id), scenes[]({id,kind}), step, miss }, tapScene(i), start(flat), autoSolve() }`
- 语音：hab_tut_watch'看！送小动物回家'/hab_tut_turn'你来送一送'/hab_hint'想想它住在哪里'/hab_right'到家啦，真开心'/hab_w_<forest|grassland|ocean|desert|pond|sky|farm> 环境不适反馈 7 条（按所选错环境一句——**反馈绑定所点环境非动物**，同环境统一文案）；情境句 TTS 拼句

## §4 交付与验收（承 batch15-24 流水线）

语音预合成（gen_clips.py 扩 batch25 块：sto_ 7+emo_ 11（5 基础+6 情绪词）+hab_ 11（4 基础+7 环境反馈）=29 条〔实长已量化：sto_right 2832/emo_right 2976+情绪词 1344-1488/hab_right 2544/hab_w_* 3528-4440/emo_wrong 3312——等待窗按此+300 余量定〕+core games 数组加三款；**合成前先跑 python 量化脚本输出每条 clip 实长写入修复窗参照——家族 H**）→ 3 agent 并行（任务书必带：家族契约 A-H 逐条/§0.58-60 真值逐条/钩子参数语义表/tapX 返回值语义=right/wrong/hold 族）→ 首单元门禁（gate_common25.py 改参）→ 独立复验（断言从 SPEC 推导：story3 故事库封闭+槽位语义+方位反馈/story3 复述句、emo 情绪封闭 6+情境映射唯一+近情绪对在场、habitat 环境 7 封闭+近环境对在场+反馈绑定所点环境）→ 全量回归 → 两级入口（batch25/index.html 三卡+主入口 72→75 卡+**href 可达性扫描**——b24 新坑契约）→ 反方审查+6 岁试玩 → 修复闭环 → 收官（6-7 段 18/30，总 75/90）
