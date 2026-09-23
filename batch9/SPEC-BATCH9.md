# SPEC-BATCH9 · 6-7 岁三款（方位指令 / 对称画 / 记忆矩阵）契约 v1（2026-09-07）

对象：6-7 岁（幼小衔接：数字 1-20 熟、识字启蒙中、空间方位与工作记忆发展期）。目录 `batch9/whereistand|mirror|memgrid/`。
结构照 batch1-8：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch8/neighbors/_src/（数学断言+数词 TTS 拼 clip 题面+救援钟 7a+sayW 最新形态）、batch8/worden/_src/（quiet 标志开场顺序链——本轮起为标准形态）、batch2/memory/_src/（记忆类交互+两态翻转）、batch4/sudoku/_src/（网格类布局）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-20 全承 batch8 原文）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/say）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环（math M1 软锁教训）；nextHint 参数=flat（非章号）；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播，入场/常规提示）+ `sayR`（救援/开场任务语音/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 sayR + **miss≥2 豁免一次**——batch8 试玩 P1② 定版形态）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen 记忆）；看=演示（locked 吞输入，演示通道 demo 参数豁免 locked 门）→帮=幽灵手指→独=首次答对放手；演示内计时循环注意 0 次边界；教学开场/交接语音用 sayR 且走**顺序链**（turn clip 播完再读题面——batch8 M3 定版：交接 quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）
7. **答错零惩罚**：晃动+灰掉可重点；首错不 pulse 正确项（q._miss>=2 才高亮）；已灰/已消失项 `pointer-events:none`（真实点击落空白轻提示路径，引擎 'again' 早退为防御层）
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
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄，batch8 M4 门禁）；clip key 全 ASCII
19. **题面指令全语音承载**（6-7 岁识字量不依赖）；答案域的文字（数字/汉字/英文单词）=训练目标，必须大字可见——这是"认"的对象不是理解障碍
20. **底栏重玩/兔子按钮守卫**：replayBtn 补 `locked||demo||won` 门、rabbitBtn 补 `locked||demo` 门；主答路径 `const run=cur` + await 后 `if (cur!==run) return` 身份守卫；hearBtn 对齐 `locked||demo||won` 门（batch8 m5）

## §1 whereistand 方位指令（左右上下+序数方位，一年级《位置》对齐）

**玩法**：5 连排（横排或竖排）小动物卡，题面语音问方位，孩子**直接点场景中的动物**（非候选卡——点场景=方位训练本体，候选卡会稀释）。每关 5 题。

- 动物库 8 只（game-data.js ANIMALS 表；每只一段简笔内联 SVG，特征鲜明：兔长耳/猫须/狗垂耳/熊圆/象鼻/猴脸圆耳呆毛（审查m3 对齐：初稿"猴尾"实现为猴脸，8 只可辨别性目标不变）/蛙鼓眼/鸭扁嘴）
- 章 1 **上下**（竖排 5 只）：题面"谁在最上面呀？"（edge up/down 交替）
- 章 2 **左右**（横排 5 只）："谁在最左边呀？"（edge left/right 交替；**方位一律屏幕方位**——一年级《位置》以观察者视角描述画面，无镜像争议，文案不用"它的左边"）
- 章 3 **序数方位**（横/竖交替）："从左边数，第 2 个是谁呀？"（k∈1-5；左数/右数/上数/下数——序数+方向双训练，一年级核心题型）
- 章 4 **混合**：edge+ordinal 全向混合+排列 5 只全库轮换；生成关=随机章型+随机方向/k
- 排列约束：5 只互异（verify 断言）；edge 答案唯一（首位/末位）；ordinal 的 k 与方向一致（左数第 k=从左起第 k 位）
- 答错=该动物晃动（不灰掉——场景卡全可点，点错晃动+sayW 计错，答对推进；首错不 pulse，miss≥2 pulse 正确位）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`WIS = { get currentLevel, get quiz(){mode('edge'|'ordinal'), dir('up'|'down'|'left'|'right'), k, answerIdx, line[](动物 id 序列), answered}, tapSlot(i), autoSolve() }`
- 语音 clip：wis_tut_watch'看！小动物们排好队啦'/wis_tut_turn'你来点一点'/wis_hint'听一听，想一想'/wis_q_up'谁在最上面呀'/wis_q_down'谁在最下面呀'/wis_q_left'谁在最左边呀'/wis_q_right'谁在最右边呀'；ordinal 题面=整句 TTS `say('从左边数，第二个是谁呀')`（数词中文常规 TTS；方位词+序数组合句 clip 化收益低，§0.13 允许）

## §2 mirror 对称画（轴对称补全，一年级图形认知对齐）

**玩法**：N×N 网格，中轴镜线（竖轴或横轴），一侧已贴图案，另一侧留空。每题高亮一个目标空格（已侧某格的镜像位），题面问"镜子右边该贴哪一张呀"，孩子从底部 3 张候选图案卡点选贴入。贴对=贴上+亮起；贴错=晃动零惩罚。每关 5 题（5 个镜像格）。

- 图案库（game-data.js MOTIFS 表）：**对称图案**（星/花/爱心/圆/方）+ **不对称图案**（小旗/小鱼/月牙/靴子/扫帚——每段简笔 SVG 且带**镜像形变体**：不对称图案渲染时右半/下半用 scale(-1,1) 翻转生成）
- 章 1 **竖轴+对称图案**（4×4，dst=src 镜像位贴同图案——建立"等距镜像"概念）
- 章 2 **竖轴+不对称图案**（候选=[镜像形, 原形, 干扰图案]——**原形干扰是镜像训练灵魂**：孩子必须认出"镜子里的样子"方向相反）
- 章 3 **竖轴 5×5+多色**（图案×颜色双维，同形不同色干扰）
- 章 4 **横轴**（上下镜像——认知转换：上下翻）+竖横混合；生成关=随机轴+随机规格+随机图案布点
- 镜像数学：竖轴 N 列 col c ↔ N-1-c；横轴 row r ↔ N-1-r（verify 断言 dst 坐标）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`MIR = { get currentLevel, get quiz(){axis('v'|'h'), N, src(r,c), dst(r,c), answer, options[](图案 id+flip 标记), answered}, tapOption(i), autoSolve() }`
- 语音 clip：mir_tut_watch'看！镜子里的图画'/mir_tut_turn'你来贴一贴'/mir_hint'想一想，镜子里是什么样子'/mir_q_v'镜子右边该贴哪一张呀'/mir_q_h'镜子下面该贴哪一张呀'

## §3 memgrid 记忆矩阵（空间工作记忆，闪现复点）

**玩法**：N×N 网格，每题 k 格**闪亮 2.5s**（记位置）→ 熄灭 → 孩子点出刚才亮过的 k 格。点对=亮起；点错=晃动+sayW 计错（不熄不锁，可修正直到 k 格全亮——零惩罚修正形态）。k 格全对=该题完成。每关 5 题。

- 章 1 **3×3 k=2** → 章 2 **3×3 k=3** → 章 3 **4×4 k=3** → 章 4 **4×4 k=4**（闪现 2.5s→2s 缩短）；生成关=随机规格+随机 k（规格对应档位）
- cells 互异（verify 断言）；闪现位置均匀随机
- **两态机制（本款特有）**：phase='show'（闪现期，点格零响应=吞输入，同 §0.6 演示锁）→ phase='input'（开放点选）；HUD 显示"记住亮起来的格子"→"点出刚才亮过的"
- 点错不重置已点亮格（修正式零惩罚）；首错不 pulse，miss≥2 时 pulse 一枚未点中的记忆格（救援支架）
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★（一次点错=1 miss，同格重复点错不累计）
- 钩子：`MEMG = { get currentLevel, get quiz(){N, cells[](闪现格 idx), k, phase('show'|'input'), picked[], miss}, tapCell(i), autoSolve() }`
- 语音 clip：mg_tut_watch'看！亮起来的格子要记住哦'/mg_tut_turn'你来点一点'/mg_hint'想一想，刚才哪里亮过呀'/mg_q'记住亮起来的格子哦'（闪现前播）
- **autoSolve 语义**：input 期逐格点 cells（show 期 tapCell 返回 false 须等待/快进——测试钩子可加 skipShow() 或 SPEED 提速由 verify 页处理）

## 验收门禁（batch-verify 口径，首单元=先交付者全指标过闸才放其余）

- 每款：①?verify=1 title=VERIFY PASS n/n ②无头真实操作通关第 1 关 ③双 viewport overflowX=0+触摸目标 ≥64px（排除 .k-parentbtn）④离线断言 ⑤截图像素非空白 ⑥钩子齐全 ⑦0 pageerror ⑧教学吞输入 ⑨答错零惩罚+首错不 pulse ⑩sayW 纠错（flat≥3 节流+miss≥2 豁免——batch8 新口径）⑪救援钟 7a（静置 16s 触发+错点不重置）⑫开场/交接语音顺序链（无 play 切断 queue——batch8 M1/M3 口径）
- whereistand 专项：verify 断言 5 只互异、edge 答案=首位/末位与 dir 一致、ordinal 答案=方向起点第 k 位、40 关 mode/dir 分布、动物 SVG 渲染 ≥64px
- mirror 专项：verify 断言 dst=src 镜像坐标（竖 col N-1-c / 横 row N-1-r）、章 2+ 候选含原形干扰且 answer=镜像形、40 关两轴覆盖、图案 SVG ≥64px
- memgrid 专项：verify 断言 cells 互异且 k=章规格、show 期 tapCell=false（吞输入）、input 期 autoSolve 全对 3 星、40 关 k 分布、网格格 ≥64px
- 语音单元：mp3 size≥800B、manifest 对账、verify_voice 专项 PASS（新 key=wis/mir/mg 各条）
- 停止条件：任款首验 FAIL≥2 停批；语音同类失败连发 3 停批
- 开发 agent 自测要求：无头 playwright 独立 chromium.launch（**绝不 connect 已有浏览器/绝不杀任何浏览器进程**）；自测真实通关后交独立复验
