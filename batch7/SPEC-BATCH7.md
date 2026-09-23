# SPEC-BATCH7 · 5-6 岁三款（钓鱼颜色 / 水果切切 / 跳格子数数）契约 v1（2026-09-07）

对象：5-6 岁（孩子 5 岁半在玩）。目录 `batch7/fishcolor|fruitsplit|hopscotch/`。
结构照 batch1-6：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch5/countchick/_src/（点选+角标+干扰项最新形态）、batch6/subbug/_src/（操作型玩法+放飞计数同构）、batch6/compare/_src/（sayW 纠错+点数角标最新形态）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-15 承自 batch5，16-19 承自 batch6+本轮新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/say）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环（math M1 软锁教训）；nextHint 参数=flat（非章号）；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播，入场/常规提示）+ `sayR`（救援/开场任务语音/读题，不受 flat 门）+ **`sayW` 纠错轻语音**（flat<3 每错必播 / flat≥3 走 10s 节流 sayR——6 岁试玩共性 P1：不识字孩子安静试错只有视觉晃动）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen 记忆）；看=演示（locked 吞输入，演示通道 demo 参数豁免 locked 门——batch5 M1 教训）→帮=幽灵手指→独=首次答对放手；演示内计时循环注意 0 次边界
7. **答错零惩罚**：晃动+灰掉可重点；**首错不 pulse 正确项（q._miss>=2 才高亮**，给再想机会）；已灰/已消失项 `pointer-events:none`（真实点击落空白轻提示路径，引擎 'again' 早退为防御层——效果等价零惩罚，5.5 岁试玩口径修订）
7a. **救援钟只被正确推进重置**（5.5 岁试玩 P1）：错点/空白/探索点击不更新 lastAct；idle 阈值 14s（学龄前注意断裂点 15s 内）——乱点型孩子（最需要救援的人群）等得到重听指令
8. **钩子 getter 返回拷贝非活引用**（tangram 教训）；quiz 取值兼容 getter/方法/属性三形态由验收脚本处理
9. **触摸目标 ≥64px**（SVG 小元素加透明命中外扩）；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0
10. **对比度 WCAG**：正文文字 ≥3:1
11. **CSS transition 坑**：元素有 transition 时 transform 变更后同步 getBoundingClientRect 量到中途位置——布局断言用纯数学或等 transition 结束
12. **core 家长门**：弹层类=.k-panel（非 .k-gate）；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（key 缺 clip 自动整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠是必犯病害；结构化内容优先 HTML grid/flex 而非 SVG 文本
16. **第一反应高发的非主交互输入须有轻反馈**（5 岁半试玩 P2）：点错区域/反向操作给轻提示语音（10s 节流，sayR）
17. **数值选项干扰项**：与答案相近、互异、非负；5-6 岁目标数值范围 1-10（禁 0 禁负）
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **5-6 岁零文字依赖**：题面信息全语音承载（5 岁半不识字）；文字仅作装饰性冗余；核心玩法不听语音也能从视觉推断（色卡/图形本身自解释）

## §1 fishcolor 钓鱼颜色（颜色辨识/反应）

**玩法**：池塘场景（SVG 水波+荷叶），若干彩色小鱼游动（CSS 动画左右游+摆尾）。顶部题面=目标色卡（大色块，视觉自解释）+语音"钓红色的鱼"。孩子点目标色鱼→鱼咬钩钓起（钓竿拉起动画+音效+计数角标 1..K）；点非目标色鱼→鱼摆尾躲开零惩罚。钓满 K 条目标色鱼→该题完成（小兔子开心）→下一题换目标色。每关 5 题。

- 章 1：基础 4 色（红/黄/蓝/绿），每屏 5-6 鱼、干扰 2-3 条，K=2
- 章 2：扩展色（橙/紫/粉）+近似对同屏（红橙、蓝紫、黄橙混入辨析），K=2-3
- 章 3：双色指令（"先钓 2 条红色，再钓 1 条黄色"——听完指令分步执行，色卡依次显示）；黑白色混入
- 章 4：屏上鱼数增多（7-9）+近似对密度升+K=3；生成关=色池随机组合（基础色+近似对保底）
- 颜色词全走 KIDS.voice.say TTS（红/黄/蓝/绿/橙/紫/粉/黑/白——短词 TTS 质量足够，同 subbug 数字先例）；色卡=视觉锚点（§0.19）
- 点非目标鱼=sayW 纠错+躲开动画；鱼游动命中判定用元素实时位置（pointerdown 命中即取，不做追点）
- 星级：错点次数 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`FIS = { get currentLevel, get quiz, tapFish(i), autoSolve() }`
- 语音 clip：fis_tut_watch'看！钓指定颜色的小鱼'/fis_tut_turn'你来钓一钓'/fis_hint'听一听，钓什么颜色的鱼'

**〔r7 难度改造 2026-09-13：上列 v1 章型/判定层/钩子/语音表作废，以本块为准（AUDIT-56 条目10 红款：颜色辨识 3 岁+语音色卡双锚零记忆需求）〕**

- **三机制**：① 两步序——题面一次播「先钓X，再钓Y」（语音+色卡双锚保留，§0.19），分步推进只换卡+轻铃**不重播语音**，两步按序完成才过题（点后步色=wrong 躲开）；去自动重播兜底，救援=idle 20s 每题一次重读全文（q._rescued）；② 间色合成——橙=红+黄/绿=黄+蓝/紫=红+蓝（MIXES 配方序=点钓序），题面=成分迷你鱼卡（双成分+圆点，视觉自解释）+目标间色大鱼，场上**绝无间色目标鱼**（合成完成播「X和Y，变成Z的小鱼啦」）；③ 鱼群游散（ch2+）——在场 present ms→散去 away ms→重撒点位重出（SCHOOL 表：ch2 18s/3.2s、ch3 15s/3.2s、ch4 12s/3s；ch1 不启用），散去期 .away pointer-events:none 不可点，已钓进度保留（_gone 不清），首发一次 fis_wait 提示，教学/演出窗暂停周期。
- **章型（dch 循环，每章 5 关，静态 20 关+生成关同通道 mulberry32(flat*7919+13)）**：ch1 单色（基础 4 色，6-8 鱼，K=2-3，干扰 2-3）；ch2 两步序（need 组合 (1,1)(2,1)(1,2)，6-9 鱼，黑白干扰 ≥1，近似干扰=0——序记忆为主负荷）；ch3 间色（三配方轮转，成分各 2 条+非成分原色 1+粉/黑/白 1-3，6-8 鱼，教学全句「橙色是红色和黄色变的，先钓红色，再钓黄色」）；ch4 混排（TYPE_PATTERNS[lv%3] 三型各 ≥1：single K=3+近似干扰 ≥2 / two 和 3-4 / mix 复习短句，8-10 鱼）。生成关 flat≥20 dch=(ch-1)%4+1 循环。
- **纠错不泄答案**：点非目标色鱼=fis_wrong'不对哦，再看看颜色'；点后步目标色（序错）=fis_wrong_seq'不对哦，先钓前面说的颜色'——均不指名哪条对；sayW flat<3 每错必播/flat≥3 10s 节流沿用；首错不 pulse、二错 breathe 当前步目标鱼沿用。
- **estMs 家族 T（r7 启用）**：`const estMs = n => n * 345 + 600;`（n=字符数，全字符口径；源常量+注释+verify 断言+build.py 字面 assert 四处同步）。
- **家族契约**：A=启动 dayEnd 传 nextHint(lim - 1)；F=生成关预告实算 `GEN_HINTS[genLevel(f + 1).dch - 1]`（禁 (ci+1)%4 字面）；CHAPTERS[ci].hint=预告下一章、GEN_HINTS 4 条按 dch 主题。
- **钩子 r7**：`FIS = { get currentLevel, get quiz(){kind('single'|'two'|'mix'), mix, targets[], need[], got[], act, miss, fishes[], gone[]}, tapFish(i), async autoSolve(), get tutorial, get school(){on, phase('present'|'away'), cycle} }`；星级 0 错=3★/≤2=2★/else=1★ 不变；教学看-帮-独不变（flat0=ch1 单色锚）。
- **时长硬指标（5-6 段 ≥40s/关）**：verify modeled=Σ题[estMs(题句长)+300 + Σneed×3200（每钓决策 dwell）+ 880 完成窗]，40 关全 ≥40000 断言（实测 min 52975ms；不含游散等待=保守下界；题句由 verify 本地副本重建并与 quizSpeech 逐字符对账防漂移）；_selftest wall-clock 真实点击（听题窗+3.2s/钓）flat1=56.4s / flat12=72.5s。
- **语音 r7（fis_ 3→6）**：新增 fis_wrong/fis_wrong_seq/fis_wait（gen_clips.py fishcolor 块注册，manifest 真值源；build.py 对账文案一字一致）；既有 fis_tut_*/fis_hint 一字未改；颜色词/两步句/间色句仍走 KIDS.voice.say TTS 拼句。
- **验证链 r7**：build 8 项字面断言（含 estMs/契约 A·F/救援 20s 一次/stepSpeech 退役/SCHOOL 在场/新键文案对账）→ ?verify=1 **52/52**（40 关审计+顺序铁律探针+间色/序错/游散/时长单元+双 viewport 布局）→ _selftest **53/53**（真实通关 ch1/ch3/ch4+教学链+wall-clock 两关+双 viewport 截图非空白+离线+0 pageerror）→ verify_one 十项 **14/14** → verify_batch7 5/5（姊妹 fruitsplit 23/23+hopscotch 22/22 不退化+voice clips=9+家长门）。

## §2 fruitsplit 水果切切（等分启蒙：整体/一半）

**玩法**：三模式交替（辨识/操作/拼合），每关 5 题按章配比：
- **辨识模式**：题面语音"哪个是一半？"，3 张大卡（整个水果/一半水果/切开的整个<两半拼回>），点对→卡片亮+庆祝；点错晃动零惩罚
- **切分模式**：大水果+小刀，孩子点刀（或从上往下滑）→水果分两半动画→两个娃娃各拿一半（"一半和一半，一样多"）
- **拼合模式**：给半块水果（左），备选 3 半块（不同水果/不同切法），找另一半拼成整个→拼成功整个水果亮起

- 章 1：辨识为主（整个 vs 一半，2 选 1 大卡→3 选 1）；水果=苹果/橙子/西瓜（圆形系，半=半圆直观）
- 章 2：切分操作（每题切 1 个；切完语音"一半和一半，一样多"）；穿插辨识复习
- 章 3：拼合（半圆配对：苹果半+苹果半=整个；干扰=橙子半/西瓜半）
- 章 4：混合三模式+新增形状（三角西瓜尖/心形草莓——不同外形的一半）；生成关=三模式随机配比
- 水果全 SVG（整个/左半/右半三态）；两半严格等大（等分概念不自相矛盾——切分动画两半同尺寸）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`FRU = { get currentLevel, get quiz(){mode('pick'|'cut'|'match'), target, options[], cutDone}, tapOption(i), doCut(), autoSolve() }`
- 语音 clip：fru_tut_watch'看！切水果啦'/fru_tut_turn'你来切一切'/fru_hint'听一听，想一想'

**〔r7 难度改造 2026-09-13：上列 v1 三模式/章型作废，以本块为准（AUDIT-56 条目 11 红款：一半概念 4-5 岁且切分无对错"随便切都算过"；建议行 68=1/3·1/4 等分选择、非等分陷阱、四人分披萨）〕**

- **五模式（全部真判定——"切了就行"退役）**：
  - **pick 辨识一半**：题面"看一看，哪一个是它的一半？"，2 选 1（整个 vs 一半，dch1 首题）→ 3 选 1（整个/一半/**一大一小陷阱**——r7 第三态由"切开拼回"升级：一半=等分两块之一，不是随便一块）；点对亮卡，点错晃动零惩罚
  - **choose 等分选择**：题面=**人数图示（2/3/4 个娃娃头）+语音**"N 个人分，选一样大的切法"；3 张切法卡（圆果+白切线）：正确=halves（一刀两份）/thirds（Y 形三份）/quarters（十字四份）按人数匹配，干扰恒含 **unfair（偏心刀一大一小）**+wrongN（份数不对的等分）；选对→水果按切法切开（n 个扇形块分离）→n 个娃娃各拿一块（"N 块一样大，很公平"）
  - **fair 公平判断**：出示切好的两块+2 娃娃——公平展示=[180°,180°] 等大 / 不公平展示=[120°,240°] 一大一小；题面 fru_fair_q"看一看，这样分公平吗？"；2 张图标大按钮（平衡天平+笑脸=公平 / 倾斜天平+大小块=不公平，零文字依赖）；答案=与展示一致；**不公平题答对→重切演出**（两块收回→等大切法→两等大块，fru_recut"重切一下，一样大才公平"）
  - **cut 切分两段**：大水果+小刀，点刀（或下滑）手感保留→两半展开+两娃娃各拿一半→**判公平段**（#judge-row 公平/不公平按钮+题面切"公平吗？"）——两半等大恒公平，**必须点对"公平"才推进**（点"不公平"=wrong 零惩罚）
  - **match 拼合**：保留（给左半+3 候选半块，干扰 kind 互异，拼回整个）
- **章型（dch 循环，每章 5 关，静态 20 关+生成关同通道 mulberry32(flat*7919+13)）**：ch1 对半=[pick,cut,choose(2人),cut,pick]；ch2 公平判断=[fair,cut,fair,choose(2人),fair]（fair 双态 T,F,T 或 F,T,F——公平/不公平都出现）；ch3 三四等分=[choose(3人),fair,choose(4人),cut,choose(3或4人)]（3、4 人都稳定出现）；ch4 混排=五模式各一洗牌（choose 人数 2/3/4 随机）。生成关 flat≥20 dch=(ch-1)%4+1 循环。
- **水果池 r7**：新增 pizza 披萨（圆系）；pick/match 池=ch1-2 苹果/橙子/西瓜、ch3 +披萨、ch4 全六款（+三角西瓜尖/心形草莓）；choose/fair/cut 池=ch1-2 圆三款、ch3+4 圆三款+披萨（**wedge/berry 不进等分切法**——非旋转对称等分切开视觉不直观，只进辨识/拼合）。
- **等大铁律**：两半=同一路径+等宽 clipPath 镜像（严格等大）；等分切块=扇形中心角相等（360/n，data-span 构造性等大）；**游戏内一切"正确答案"恒为等分**——不公平展示是题面判断对象，指出后重切为等大。
- **estMs 家族 T（r7 启用）**：`const estMs = n => n * 345 + 600;`（n=码点数；源常量+注释+verify 断言+build.py 字面 assert 四处同步；禁 +300 变体）。
- **时长硬指标（5-6 段 ≥40s/关）**：verify modeled=Σ题[estMs(题句码点)+SPEC_T{pick3000+880 / choose3500+2800 / fair2800+2600 / cut3800+3600 / match3000+880}]，40 关全 ≥40000 且每题 ≥8000 断言（实测 min 50560ms；题句 ≥11 码点下限由 verify 独立重列表对账）。
- **家族契约**：A=dayEnd 预告传 `nextHint(lim - 1)`（启动+winFlow 两处，审查 M2 收敛；禁裸传 lim）；F=生成关预告实算 `GEN_HINTS[genLevel(f + 1).dch - 1]`（禁 (ci+1)%4 字面，build.py 源码级断言）；CHAPTERS=对半分/公平吗/三四份/大挑战。
- **钩子 r7**：`FRU = { get currentLevel(+judging), get quiz(){mode('pick'|'choose'|'fair'|'cut'|'match'), target, parts, fairIsFair, spans, judging, options[], cutDone}, tapOption(i), doCut()→'judge', async autoSolve(), get tutorial }`；星级 0 错=3★/≤2=2★/else=1★ 不变；教学看-帮-独不变（flat0 首题恒 pick 2 选 1）。
- **语音 r7（fru_ 3→8）**：新增 fru_choose'想一想，几个人分，就切成一样大的几块'/fru_fair_q'看一看，这样分公平吗？'/fru_fair_yes'对啦，一样大，很公平'/fru_fair_no'一边大一边小，不公平'/fru_recut'重切一下，一样大才公平'（gen_clips.py fruitsplit 块注册，manifest 真值源）；既有 fru_tut_watch/fru_tut_turn/fru_hint 一字未改；人数句/答对计数句仍走 KIDS.speak TTS。
- **验证链 r7**：build 6 项字面断言（estMs 四处/契约 A·F/离线/无 </script>）→ ?verify=1 **49/49**（40 关审计含时长分账+等大/扇形/判定边界单元+双 viewport 12 sims 五模式全覆盖）→ _selftest **47/47**（教学链+公平展示对账+切分两半等大+judge-row+判定错零惩罚+choose span120×3+双 viewport 截图+离线+0 pageerror）→ verify_one 十一项 **23/23**（⑫ r7 专项=等分选择/非等分陷阱重切/多人分布/时长硬断言）→ verify_batch7 姊妹回归。

## §3 hopscotch 跳格子数数（顺数/倒数 1-10）

**玩法**：河边一排 10 个大圆石格子（数字 1-10，数字大字+点数圆点双重冗余显示），小兔子站在当前格。题面语音"跳到 7"（目标格高亮旗子）。孩子从当前位置**逐格点相邻格**（每点对一格兔子跳过去+TTS 报数"5！"）；到目标格→旗帜+庆祝。点非相邻格/跳过格→兔子摇头零惩罚（sayW"一格一格跳"）。每关 5 题。

- 章 1：顺数 1-5（起点 1，目标 3-5，走 2-4 格）
- 章 2：顺数 6-10（起点 3-5，目标 8-10——中途数 6、7）
- 章 3：倒数（从 8 跳回 4：点 7,6,5,4——倒数报数；起点目标差 3-5）
- 章 4：混合顺倒+**藏数字格**（途中有 1-2 格数字藏起来只显示点数圆点，点对才亮出数字——数序内化）；生成关=随机起终点+方向
- 报数=TTS say；方向提示=旗子颜色（红旗=往前，蓝旗=往回）+语音明示"往回跳"（§0.19 视觉+语音双载）
- 星级：错点次数 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`HOP = { get currentLevel, get quiz(){from, to, dir, cur, hidden[]}, tapCell(n), autoSolve() }`
- 语音 clip：hop_tut_watch'看！跳格子数数'/hop_tut_turn'你来跳一跳'/hop_hint'听一听，跳到几'

### §3-r7 难度改造（2026-09-13，AUDIT-56 #12/建议行 69；本节覆盖上方 v1 章配置）

**改造动机（审计判红）**：数序 1-10 顺倒数=4-5 岁水平；三重兜底「不识数也能玩」（格全亮/逐格提示/点数恒显）；推算单关仅 120-240s 且时长多为演出窗。

**六章设计（每章 5 关，静态 30 关=flat 0-29；生成关 flat≥30 按 (ch-1)%6+1 循环六章取材）**：
| dch | 章 | span | 规则（每题） |
|---|---|---|---|
| 1 | 往前跳 | 10 | from=1，to 5-8（走 4-7 格），全显 |
| 2 | 数到二十 | 20 | to 15-20，len 4-8（必经 11-20 段），全显 |
| 3 | 往回跳 | 20 | 倒数 len 5-8（from=to+len≤20，to≥5），蓝旗 |
| 4 | 猜石头 | 10 | len 4-8，偶顺（from=1）奇倒（to=1）；**途中格数字全藏**（点数保留） |
| 5 | 大石头阵 | 20 | len 4-8，偶顺奇倒；途中格全藏；远端≥14 必跨 11-20 段 |
| 6 | 跳两格 | 20 | mode=2 跳距恒 2：偶链 from=2→to 8-16 偶 / 奇链 from=1→to 7-15 奇（qi 偶奇交替，每关双链都有）；len=距离 6-14（3-7 跳），全显 |

- **跳步规则**：合法步=与当前位置相距恰一个步长（mode1=±1/mode2=±2，方向不限）；点其余格（含 mode2 只跳一格）=far 零惩罚弹回。链上格挂双箭头 »，非链石头减淡（.off，仍可点零惩罚学习）
- **藏格心算（去兜底）**：dch4/5 途中格（inner 全集，不含起终点）数字 visibility:hidden 只显点数；踩到才点亮=已跳格轨迹；起点锚=from 格数字常显+目标格旗。**已删「连错 2 次 pulse 下一格」逐格发光兜底**（全场恒无 pulse）；保留支持面：起点锚+已跳轨迹+语音读题+14s idle 救援重读题+错跳零惩罚——相邻/步长格恒合法故无卡死态
- **11-20 点数圆点=十点阵**：n≥10 起 floor(n/10) 个 .ten 边框格（内恰 10 小点）+个位圆点；.dots 内 <i> 总数恒=n（布局断言不变量）
- **题面语音**：顺='跳到N'/倒='往回跳，跳到N'/跳2='两块两块跳，跳到N'（mode2 规则全语音承载；报数 TTS 到 20）
- **纠错语音**：mode1='一格一格跳'（hop_wrong，TTS 兜底）/mode2=**hop_wrong2'两块两块跳'（r7 新 clip）**；既有 hop_tut_watch/hop_tut_turn/hop_hint 文本一字不改
- **r7 时长模型（单关推算 ≥40s 硬断言，50 关全过）**：`estMs=n*345+600`（家族定版字面，禁 +300 变体；四处同步=game-data 定义/game-main 注释/game-verify 断言/build.py 字面 assert）；每题=estMs(题面句长)+Σhop(数字可见 1800ms/下一格藏起 2600ms)+到旗窗 900ms；实测 30 静态关+20 生成关区间 55.9-102.4s
- **家族契约**：A=dayEnd 预告传 nextHint(lim-1)（启动+winFlow 两处，build.py 断言）；F=生成关预告实算 GEN_HINTS[genLevel(f+1).dch-1]（禁"章索引加一取模"字面，build.py 负向断言）；N_CH=6/SPAN 表驱动
- **钩子增字段**：HOP.quiz 增 mode/span/hide；HOP.currentLevel 增 span
- **verify 适配**：50 关审计（六章规则独立重列+确定性+引擎直驱 mode 步长+时长独立副本 ≥40000ms）+跳2 单元（flat25）+藏格单元（flat15，inner 全集+恒无 pulse）+数域20 单元（flat5，20 格 4 行+十点阵不变量）+布局双 viewport×4 代表关
- 旧存档兼容：keyOf 不变（1-0..6-4 扩容），proceed 从首个未完成关继续，无迁移

## 验收门禁（batch-verify 口径，首单元=先交付者全指标过闸才放其余）

- 每款：①?verify=1 title=VERIFY PASS n/n ②无头真实操作通关第 1 关（fishcolor 真实点鱼、fruitsplit 真实点卡/切、hopscotch 真实逐格点）③双 viewport overflowX=0+触摸目标 ≥64px（游动鱼按实时位置断言）④离线断言 ⑤截图像素非空白 ⑥钩子齐全 ⑦0 pageerror ⑧教学吞输入 ⑨答错零惩罚+首错不 pulse ⑩flat≥3 纠错语音 sayW 生效（verify_player6_fixes 模式）
- fishcolor 专项（r7 版，覆盖 v1 表述）：verify 断言每题每步目标色鱼数 ≥need、干扰色不含目标色（同名不混）、间色题场上无间色目标鱼且成分各 ≥2、两步序点后步色=wrong（顺序铁律探针 40 关全测）、40 关 modeled 时长 ≥40s、游散周期 present→away→重出进度保留
- fruitsplit 专项（r7 版，覆盖 v1 表述）：verify 断言切分两半等大（SVG 路径镜像对称）+切后判公平段按钮在场、choose 答案切法=份数匹配等分且干扰含 unfair+wrongN、fair 展示 spans 与公平性一致（不公平答对→重切等大）、等分切块 data-span 全等=360/n、cut 两段引擎（engCut→'judge'→engPick）、40 关 modeled ≥40s、多人 2/3/4 全覆盖、拼合干扰 ≠正确半块同款、辨识/choose/fair 答案索引随机
- hopscotch 专项：verify 断言 from≠to、方向与起终点一致（to>from 顺/to<from 倒）、藏数字格不出现在起终点、每题路径长 2-5 格
- 语音单元：mp3 size≥800B、manifest 对账、verify_voice 专项 PASS
- 停止条件：任款首验 FAIL≥2 停批；语音同类失败连发 3 停批
- 开发 agent 自测要求：无头 playwright 独立 chromium.launch（**绝不 connect 已有浏览器/绝不杀任何浏览器进程**）；自测真实通关后交独立复验
