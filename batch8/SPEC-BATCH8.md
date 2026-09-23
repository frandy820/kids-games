# SPEC-BATCH8 · 6-7 岁三款（数的邻居 / 象形字 / 英语单词）契约 v1（2026-09-07）

对象：6-7 岁（幼小衔接：数字 1-20 熟、识字启蒙中、英语零起点）。目录 `batch8/neighbors|picto|worden/`。
结构照 batch1-7：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch6/words/_src/（识字类+48 字封闭库+chKey 拼音 clip 模式）、batch7/hopscotch/_src/（数序+sayW+救援钟 7a 最新形态）、batch7/fishcolor/_src/（题面动态 TTS qSpeech 模式）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-18 承 batch6，19 承 batch7，20 本轮新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/say）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环（math M1 软锁教训）；nextHint 参数=flat（非章号）；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播，入场/常规提示）+ `sayR`（救援/开场任务语音/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 sayR）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen 记忆）；看=演示（locked 吞输入，演示通道 demo 参数豁免 locked 门）→帮=幽灵手指→独=首次答对放手；演示内计时循环注意 0 次边界；教学开场/交接语音用 sayR
7. **答错零惩罚**：晃动+灰掉可重点；首错不 pulse 正确项（q._miss>=2 才高亮）；已灰/已消失项 `pointer-events:none`（真实点击落空白轻提示路径，引擎 'again' 早退为防御层——batch7 §0.7 口径）
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s；救援内容=重读题面 qSpeech（非通用催促句）
8. **钩子 getter 返回拷贝非活引用**（tangram 教训）；quiz 取值兼容 getter/方法/属性三形态由验收脚本处理
9. **触摸目标 ≥64px**（SVG 小元素加透明命中外扩）；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn`（core 家长按钮 44px）豁免
10. **对比度 WCAG**：正文文字 ≥3:1
11. **CSS transition 坑**：元素有 transition 时 transform 变更后同步 getBoundingClientRect 量到中途位置——布局断言用纯数学或等 transition 结束
12. **core 家长门**：弹层类=.k-panel（非 .k-gate）；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（key 缺 clip 自动整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠是必犯病害；结构化内容优先 HTML grid/flex 而非 SVG 文本
16. **第一反应高发的非主交互输入须有轻反馈**：点错区域/反向操作给轻提示语音（10s 节流，sayR）
17. **数值选项干扰项**：与答案相近、互异、非负；禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **题面指令全语音承载**（6-7 岁识字量不依赖）；答案域的文字（数字/汉字/英文单词）=训练目标，必须大字可见——这是"认"的对象不是理解障碍
20. **底栏重玩/兔子按钮守卫**：replayBtn 补 `locked||demo||won` 门、rabbitBtn 补 `locked||demo` 门（batch7 M1 教训）；主答路径 `const run=cur` + await 后 `if (cur!==run) return` 身份守卫

## §1 neighbors 数的邻居（±1 数感，幼小衔接核心）

**玩法**：数字小街——一排小房子挂门牌号（1-20 按序，房子里住着小动物）。每题一个空房子（高亮+问号旗），题面语音（数字走 TTS say）"5 的邻居是几呀？比 5 多 1"+ 口头指令 clip。孩子从底部 3 张门牌候选卡点选填入空房→填对小动物搬进去亮灯庆祝；填错晃动零惩罚。每关 5 题。

- 章 1：比 n 多 1（n∈1-9；空房在 n+1 位，两侧房亮号做数轴锚点；候选含 n+1/n+2/n-1 型干扰）
- 章 2：比 n 少 1（n∈2-10；候选干扰 n-2/n+1）
- 章 3：大数字+跨十（n∈10-19，+1/-1 混合；19→20、10→9 跨十/退十专项出现 ≥2 题/关）
- 章 4：中间空位（亮 7 和 9 填 8 型——空房两侧给号，需双向判断 ±1；顺逆混合）；生成关=随机章型+随机 n
- 视觉锚点：房子序列=数轴具象化（空房左右邻居房号恒可见，孩子可"顺着数"自行验证——数感支架非记忆测试）；门牌数字大字（训练目标 §0.19）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`NEB = { get currentLevel, get quiz(){mode('plus'|'minus'|'mid'), n, answer, options[], filled}, tapOption(i), autoSolve() }`
- 语音 clip：neb_tut_watch'看！空房子要挂门牌号'/neb_tut_turn'你来挂一挂'/neb_hint'听一听，想一想，比几多一呀'/neb_q1'的邻居是几呀？比它多一'/neb_q2'的邻居是几呀？比它少一'/neb_q4'中间住的是几号呀'（题面=数字 TTS 拼 clip 句式，如 say('五')+play('neb_q1')）
- 数字 TTS 用中文数词（1-20 与 hopscotch numCn 同源写法）

## §2 picto 象形字（识字启蒙：字源配对）

**玩法**：两模式交替：**图→字**（给一张古画风的象形图，从 2-3 张汉字卡点对的→卡片亮+语音读字组词"日，太阳的日"）；**字→图**（给汉字，从 2-3 张象形图中选对的）。每关 5 题。

- 封闭字库 20 字（game-data.js PICTO 表；象形图=每字一段简笔甲骨文风内联 SVG，agent 绘制，要求笔画简、特征鲜明、与楷体形近可溯源）：
  日 月 山 水 火 木 人 口 田 鸟 马 鱼 雨 云 门 石 目 禾 竹 舟
- 章 1：图→字（2 选 1→3 选 1；干扰=库内非形近字）
- 章 2：字→图（2 选 1→3 选 1）
- 章 3：形近辨析（干扰限形近对：日/目、口/田、木/禾、马/鸟、田/日——章内形近对出现 ≥3 题）
- 章 4：混合两模式+库全量轮换（含形近干扰）；生成关=随机模式+随机字（形近干扰 40% 概率）
- 每字组词 clip（zh 晓晓，'X，YY的X' 格式，20 条）：日太阳/月月亮/山大山/水河水/火火焰/木树木/人大人/口开口/田水田/鸟小鸟/马小马/鱼小鱼/雨下雨/云白云/门大门/石石头/目眼睛/禾禾苗/竹竹子/舟小船
- 答对=读字组词 clip（识字强化：音-形-义三绑定）；答错=灰卡可重点（sayW）；**不识字也能玩**：题面语音+象形图自解释（图→字模式对零识字孩子=看图配字游戏）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`PIC = { get currentLevel, get quiz(){mode('toChar'|'toPic'), target, options[], answered}, tapOption(i), autoSolve() }`
- 语音 clip：pic_tut_watch'看！古时候的人画图造字'/pic_tut_turn'你来找一找'/pic_hint'听一听，找一找'/pic_q1'看一看，古时候的画是哪个字呀'/pic_q2'看一看，哪个是它古时候的画'+pic_ch_* 20 条
- 象形图 SVG 触摸目标 <64px 须加透明命中外扩（§0.9）

### §2-r12 picto 难度改造定稿（2026-09-15，AUDIT-67 #8 红款：中班识字卡低 ≥2 岁 / ch1 两选蒙对 50% / 纯视觉辨别无「想」）

delta 三条（AUDIT-67:62 定稿，verify ⑦ 独立副本锚点以此节为真值源）：

**① 字库 20→40（前 20=v1 序零改动，后 20=r12 追加序）**
```
前 20：ri yue shan shui huo mu ren kou tian niao ma yu yu2 yun men shi mu2 he2 zhu zhou
后 20：wu wei mo ben bai tian2 da tai dao li san chuan wang yu3 xiao shao shou mao jia you
```
（乌 未 末 本 白 天 大 太 刀 力 三 川 王 玉 小 少 手 毛 甲 由；jia=甲、you=由、tian2=天）

**② 形近族体系（NEAR 直邻对 19 对 → sameFam 同族 → famOf 干扰池）**
- NEAR 19 对（isNearPair 双向）：ri-mu2、ri-tian、kou-tian、mu-he2、niao-ma、niao-wu、wei-mo、wei-mu、mu-ben、ri-bai、da-tian2、da-tai、dao-li、san-chuan、wang-yu3、xiao-shao、shou-mao、tian-jia、tian-you（新 14 对，AUDIT 点名未/末、鸟/乌在内）
- `sameFam(a,b)` = 直邻对 或 共直邻伙伴（dist≤2 同族）；`famOf(k)` = 同族可干扰字池
- `DEEP_KEYS` = famOf≥2 的 18 字（ch2/3/4 匹配题目标池）；`EVO_KEYS` = 12 字（字源推演池）：ri mu tian kou niao ma mu2 wei mo he2 wu jia（每字带 `ev` 古形 SVG，ev≠svg 两段可辨）

**③ 章型（进度章号单调、难度章号 (ch-1)%4+1 循环）与选项数（ch2 起恒 3-4 选，蒙对率 50%→25-33%）**
- dch1 图→字入门：toChar；干扰=非同族字（sameFam 全排除）；lv0-1 两选→lv2-4 三选；目标池=全库 40（两轮 dch1 覆盖全库）
- dch2 字→图：toPic；干扰全 ∈famOf；基数 3，fam≥3 且 lv≥3 升 4（`Math.min(n, fam+1)` 保恒 3-4）；目标池=DEEP 18
- dch3 形近辨析（峰）：toChar/toPic 奇偶交替；fam≥3 恒 4 选；目标池=DEEP 18（章内全覆盖）
- dch4 混合+字源推演：`MIX_PAT = ['toChar','toPic','evo','toChar','evo']` 固定题型谱（evo×2、两匹配必现）；evo 目标=EVO 每关 2 连取（先定保旋转覆盖）、匹配目标=DEEP 每关 3 连取避开已用；干扰全 ∈famOf
- **evo 字源推演题**（delta③ 匹配→推演）：题面=两段演变行 `[ev 古形 → 箭头 → svg 甲骨 → 箭头 → ?]`（DOM：`.pic[data-k0]`+`.pic[data-k]`+`.evo-q` 虚线问号卡），题面零汉字泄漏（判定=推演非匹配）；选项=汉字卡；clip pic_q3'看一看，它一步一步变成了什么字'

**时长模型（6-7 岁单关 ≥40s；认知步主体非演出窗）**
```
estMs = n => n * 345 + 600        // SAPI 拼句时长估计（四处同步：源常量+注释+verify V_EST 副本+build.py 字面 assert；禁 +300 变体）
LOOK_MS = { m1: 4800, m2: 6200, m3: 6800, m4: 6200, evo: 8400 }   // 认知观察窗分档（evo 最长）
MOTOR_MS = 800, RIGHT_MS = 1900   // 操作+答对演出窗（与 await wait(1900*SPEED) 对账）
LEVEL_MIN_MS = 40000              // 单关下限硬断言（实测 durMin≈64650ms，认知占比≈79%）
quizDurMs = estMs(题面句长) + LOOK(档) + MOTOR + RIGHT
```

**契约升级（b8 老批次照 bridge r9 口径）**：dayEnd 两处 `nextHint(lim - 1)`（启动分支+winFlow）；生成关预告实算 `GEN_HINTS[genLevel(f+1).dch-1]`（禁字面取模）；静态章末预告 `CHAPTERS[floor(f/CH_LEN)+1].hint`。CHAPTERS/GEN_HINTS 文案按「预告下一章」语义重写（verify ⑦ SPEC_HINT 独立副本+off-by-one 哨兵）。

**clip 扩容**：pic_q3 新增；pic_ch_ 后 20 字新增（gen_clips.py len(PICTO)==40 断言）；既有 pic_* 文本一字不改。构建注入 49 条（46 pic_ + 3 core_）。

**verify 拆独立第 4 script 块**（照 batch36/comfort build.py 185-190 先例——拆块后页内源码断言恢复判别力）；⑦ delta 单元全部 SPEC 独立副本（SPEC_KEYS 40 序/SPEC_PAIRS 19 对+新对≥6/判别力哨兵/覆盖 d1=40,d2=d3=d4=18,evo=12/46 clips/estMs/nextHint 逐点）。

## §3 worden 英语单词（图→词配对，英语零起点）

**玩法**：四模式递进（图→词建立形-音 → 听音选图建立音-义 → 形近辨析 → 词→图认读收官）。每关 5 题。

- 封闭词库 24 词（game-data.js WORDS 表；每词=一张简笔内联 SVG 图；词卡显示英文单词大字）：
  cat dog fish bird rabbit / apple banana orange grape / egg milk cake / sun moon star rain / book ball car tree / hand eye ear nose
- 章 1 **图→词**：给图，2 张词卡选（点对→播该词英语 clip en 发音+庆祝；建立形-音）
- 章 2 **听音→图**：播英语发音 clip，2-3 张图选（音-义；点对再播一遍巩固）
- 章 3 **图→词+形近干扰**：3 选 1，干扰=库外形近词卡（cat/cap、dog/dot、book/look、cake/lake、star/stop、hand/head——干扰卡仅显示不发音，点错=sayW 通用纠错）
- 章 4 **词→图**（认读）+三模式混合；生成关=随机模式+随机词
- 英语发音 clip 24 条：**en-US-AnaNeural（女童声）**，文案=单词本身；gen_clips.py per-key voice 支持；指令句 zh 晓晓
- 指令 clip：wen_tut_watch'看！小动物们有英语名字'/wen_tut_turn'你来点一点'/wen_hint'听一听，再想一想'/wen_q1'找一找，它的英语是哪一个'/wen_q2'听一听，点出你听到的单词'/wen_q4'读一读，点出它的图片'
- 词卡英文大字（认读对象 §0.19）+ 字母间距放宽（6-7 岁字母辨识）；禁止自动大写变形（统一小写=教材惯例）
- 听音题（章 2/4 混合段）开题自动播发音+听按钮可重播（sayR 不受 flat 门；重播节流 3s 防连点轰炸）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`WEN = { get currentLevel, get quiz(){mode('pic2word'|'sound2pic'|'word2pic'), target, options[], answered}, tapOption(i), autoSolve(), replay() }`

## 验收门禁（batch-verify 口径，首单元=先交付者全指标过闸才放其余）

- 每款：①?verify=1 title=VERIFY PASS n/n ②无头真实操作通关第 1 关 ③双 viewport overflowX=0+触摸目标 ≥64px（排除 .k-parentbtn）④离线断言 ⑤截图像素非空白 ⑥钩子齐全 ⑦0 pageerror ⑧教学吞输入 ⑨答错零惩罚+首错不 pulse ⑩sayW 纠错（flat≥3 节流）⑪救援钟 7a（静置 16s 触发+错点不重置）
- neighbors 专项：verify 断言答案= n±1 与 mode 一致、候选互异且非负、跨十章 19→20/10→9 各出现 ≥1、门牌数字与 TTS 数词一致、40 关 mode 分布
- picto 专项：verify 断言 20 字库全量覆盖 40 关、形近章干扰 ∈形近对表、图→字与字→图选项结构、SVG 象形图渲染尺寸 ≥64px（含外扩）
- worden 专项：verify 断言 24 词库覆盖、形近干扰卡 ≠库内词、听音题开题自动播 en clip、词卡文本与 WORDS 表严格一致（零手抄同源断言）
- 语音单元：mp3 size≥800B、manifest 对账（含 en voice 条目）、verify_voice 专项 PASS（worden 含 24 词 en clip 全覆盖运行时抽查）
- 停止条件：任款首验 FAIL≥2 停批；语音同类失败连发 3 停批
- 开发 agent 自测要求：无头 playwright 独立 chromium.launch（**绝不 connect 已有浏览器/绝不杀任何浏览器进程**）；自测真实通关后交独立复验
