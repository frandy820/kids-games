# SPEC-BATCH6 · 6-7 岁三款（识字积木 / 比较大小 / 减法捕虫）契约 v1（2026-09-06）

对象：6-7 岁（幼小衔接）。目录 `batch6/words|compare|subbug/`。
结构照 batch1-5：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch5/countchick/_src/（点选+角标最新形态）、batch5/connect/_src/（PAIR_VOICE 正则提取+知识语音形态）、batch3/math/_src/（6-7 岁算术题面形态）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-15 承自 batch5，16-18 本轮新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环（math M1 软锁教训）；nextHint 参数=flat（非章号）；章末预告=CHAPTERS[ci+1]；GEN 文案不带"明天："前缀（core 模板自带）；启动 dayEnd 的 nextHint 传 lim
5. **语音三包装**：`sayP`（仅 flat<3 播，入场/答错常规提示）+ **`sayR` 救援（不受 flat 门，if(cur) 即播；idle 20s 看护必用）** + **开场任务语音也用 sayR**（5 岁半试玩共性 P2：不识字孩子 flat≥3 全静默——6-7 岁同样普惠）
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen 记忆）；看=演示（locked 吞输入，演示通道 demo 参数豁免 locked 门——batch5 M1 教训）→帮=幽灵手指→独=首次答对放手；演示内计时循环注意 0 次边界
7. **答错零惩罚**：晃动+灰掉可重点；**首错不 pulse 正确项（q._miss>=2 才高亮**，给再想机会）；已灰项重点返回 'again' 早退不计数
8. **钩子 getter 返回拷贝非活引用**（tangram 教训）；quiz 取值兼容 getter/方法/属性三形态由验收脚本处理
9. **触摸目标 ≥64px**（SVG 小元素加透明命中外扩）；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0；横屏布局优先左右并排（spotdiff 教训：竖排堆叠横屏浪费宽度）
10. **对比度 WCAG**：正文文字 ≥3:1（getComputedStyle 取色算 relative luminance）
11. **CSS transition 坑**：元素有 transition 时 transform 变更后同步 getBoundingClientRect 量到中途位置——布局断言用纯数学或等 transition 结束
12. **core 家长门**：弹层类=.k-panel（非 .k-gate）；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（key 缺 clip 自动整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠是必犯病害；结构化内容优先 HTML grid/flex 而非 SVG 文本
16. **第一反应高发的非主交互输入须有轻反馈**（5 岁半试玩 P2）：点错区域/反向操作给轻提示语音（10s 节流，sayR）
17. **数值选项干扰项**：与答案相近（±1/±2）、互异、非负；6-7 岁 0 合法（subbug 答案可为 0=N-N，但干扰项仍避免无意义 0——见 §3）
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄，connect PAIR_VOICE 模式）；clip key 全 ASCII

## §1 words 识字积木（部件拼字）

**玩法**：题面给目标字（大字展示+朗读），下方是打乱的部件积木块（正确部件 2-3 个+干扰块 1-2 个）。孩子按序点部件块→飞入上方拼字槽；点错槽位部件可点槽撤回。全部槽位正确→字亮起+读音+组词语音→下一字。

- 字库 48 字封闭（12 字/章，game-data CHARS 表手工定稿）：全部选部件本身是常用字/知名部首的可靠拆法，禁止争议拆字
- 章 1：2 部件独体组合（明/林/双/男/岩/尘/尖/灶/鲜/汗/村? 村=木+寸✓/看）；干扰块 1 个
- 章 2：2 部件+干扰块 2 个；含同部件辨析对（他/地 同"也"；妈/奶 同"女"；江/河 同"氵"）
- 章 3：3 部件字（森/晶/品/想/树/湖/唱/花/意? 意=立日心? 取稳：森晶品想树湖唱花+笔(⺮毛)/苗(艹田)/明? → 12 字表数据定稿时核准，每字拆法 verify 断言部件数 2-3）
- 章 4：混合 2/3 部件+同部首家族辨析（**章内家族**：洋/洗 同氵、听/叶 同口、苗/草/花 同艹、松/梦 同木同屏干扰——反方审查 m1 修订：原"跨章家族"措辞与实现不符，跨章干扰池会引入超纲部件，章内家族机制等效成立）
- 槽位=目标字的部件数；点部件进下一空槽；点已填槽撤回该部件回底部；干扰块进槽=晃动零惩罚弹回
- 星级：干扰块进槽/提交错次数 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`WRD = { get currentLevel, get quiz(){target, parts[], distractors[], slots[]}, tapPart(i), tapSlot(i), autoSolve() }`
- 语音：wrd_tut_watch'看！拼出这个字'/wrd_tut_turn'你来拼一拼'/wrd_hint'想一想，拼一拼'；**每字一条读音+组词** clip `wrd_ch_<py>`（text='明，明天的明'），CHARS 表 {c,py,parts,w} 正则提取合成

## §2 compare 比较大小（> < =）

**玩法**：屏幕左右两组物品（SVG 小动物/水果，排布成可点数阵列），中间底部三个大符号按钮（> < =，≥96px，画嘴巴式符号+朗读语义）。孩子点数比较后点正确符号。符号正确→两组物品圈起来+符号飞入中间+朗读"左边多/右边多/一样多"；错误=符号晃动零惩罚。

- 章 1：5 以内实物计数比较，差不小于 2（大小差异一眼可辨）；符号按钮带动物嘴比喻（>开口朝大数"张大嘴吃多的"）
- 章 2：10 以内实物，差 1-3；引入"="（相等对每关 ≥1 题）
- 章 3：10 以内实物+**数字卡模式混合**（左数字右实物/双数字，开始抽象化）；差 1 近邻
- 章 4：20 以内混合三模式；大数字不点数直接比（数位感）
- 每题随机左右（避免"总是左边大"位置惯性——verify 断言三符号均出现、'>'与'<'比例 4:4~6:4）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`CMP = { get currentLevel, get quiz(){mode('count'|'num'|'mix'), left{n,kind}, right{n,kind}, answer, items}, pick(s), autoSolve() }`
- 语音：cmp_tut_watch'看！哪一边多'/cmp_tut_turn'你来比一比'/cmp_hint'数一数，比一比'

## §3 subbug 减法捕虫（20 以内减法）

**玩法**（动手减法，接 countchick 点数成功经验）：叶子场景 N 只小虫（SVG，颜色微随机）。语音+题面"飞走了 M 只"。孩子**点虫放飞**（每点一只飞走动画+音效，飞走计数角标 1..M；点满 M 只后剩余虫呼吸高亮提示点数）→ 孩子数剩余选答案（3 个数字大按钮）。点虫是辅助：不点虫直接答题也允许（错了零惩罚）。

- 章 1：5 以内（N≤5，M≥1）；章 2：10 以内；章 3：20 以内含跨十（15-7）；章 4：20 以内+混入干扰虫（瓢虫不算，"只数绿虫"——复用 countchick 干扰机制）
- 减法生成约束：M<N（剩余 ≥1）章 1-2；剩余=0 题**章 3 必含**（每关 ≥1 题答案 0，教学点"全飞走了"）、章 4 不含（反方审查 m3 口径收敛：SPEC 原"章 3-4 允许"为许可式，实现为章 3 强制/章 4 恒无）；干扰项=N-M±1/±2 互异非负且 ≠0（除非答案=0）
- 放飞计数：头顶角标 1..M 递增（照 countchick）；"重新飞"按钮清零重放
- 星级：答错次数 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`SUB = { get currentLevel, get quiz(){n, m, answer, items[], answerIdx, distractors}, tapBug(i), recount(), pick(i), autoSolve() }`
- 语音：sub_tut_watch'看！小虫飞走了'/sub_tut_turn'你来算一算'/sub_hint'数一数，还剩几只'

## 验收门禁（batch-verify 口径，首单元=先交付者全指标过闸才放其余）

- 每款：①?verify=1 title=VERIFY PASS n/n ②无头真实操作通关第 1 关（subbug 真实点击放飞+选答案、words 真实点部件、compare 真实点符号）③双 viewport overflowX=0+触摸目标 ≥64px ④离线断言 ⑤截图像素非空白 ⑥钩子齐全 ⑦0 pageerror ⑧教学吞输入 ⑨答错零惩罚+首错不 pulse
- words 专项：48 字部件拆法正确性人工核验（每字 parts 表 vs 字形——agent 交付时附拆法清单）；verify 断言每题 parts 数 2-3、干扰块不与正确部件重复
- compare 专项：verify 断言三符号分布（40 关 '>'/'<' 各 ≥30%、'=' ≥15%）+相等题每关 ≥1（章 2+）
- subbug 专项：verify 断言答案=N-M 且 ≥0、干扰项规则、章 4 干扰虫 2-4 只不计数
- 语音单元：mp3 size≥800B、manifest 对账、verify_voice 专项 PASS（words 含 CHARS 表运行时映射全覆盖抽查——pinyin 模式）
- 停止条件：任款首验 FAIL≥2 停批；语音同类失败连发 3 停批
- 开发 agent 自测要求：无头 playwright 独立 chromium.launch（**绝不 connect 已有浏览器/绝不杀任何浏览器进程**）；自测真实通关后交独立复验
