# SPEC-BATCH2 — 第二批三款游戏契约（记忆翻牌 / 七巧板 / 涂色本）

> 与 design/DESIGN-SPEC.md（v1）共同生效：§0 产品硬约束、§1 通用技术、§2 会话结构、§3 存档 schema、§4 core API、§8 视觉、§9 音频、§10 引导全部沿用，本文只写第二批增量。凡冲突以本文为准。
> 面向 5-6→8 岁女孩；单文件离线；鼠标+触摸双适配；完成后由主会话 playwright 模拟真实用户验收（用户不当测试员）。

## 0. 第二批共同约定（三款全部遵守）

- **core.js 原样内嵌**：build 脚本读 `F:/claudecode/projects/active/kids-games/design/core.js` 全文拼接，禁止手抄改写。硬性断言 `settle()` 与 `queue(parts)` 都在（旧版 core 检测）。
- **game id**：`memory` / `tangram` / `color`（KIDS.init 传参，localStorage key=kidsgame_memory 等）。
- **章号一律 1 基**（写档读档都是 `ch-lv`，ch 从 1 数）。第一批 shop 0/1 基混用致章末软锁的教训。
- **内容日历**：`limit(Infinity)`（内容无限）；每日新关 6（首日）/12（第 2 天起，core 已封顶）；家长面板输入框加关由 core 自带。无限关生成必须确定性：`mulberry32(levelIdx * 7919 + 13)` 种子（同 idx 永远同关）。
- **语音**：全部走 `KIDS.voice.play(key, text)` 双参——key 是未来合成音频的 clip 名，text 是 TTS 兜底文案。**游戏内语音只在前 3 关（flat<3）播**，之后静音（第一批用户反馈"太频繁"）；core 的章末/日末/休息语音是低频的照常。做法照抄 pipe 的 `sayP` 包装。文案保持简短（≤18 字一句）。
- **失败零惩罚 / 无倒计时 / 主触摸目标 ≥96px / 间距 ≥16px / pointerdown 即响应不等 pointerup**。
- **`?verify=1` 自检**：结果 JSON 写 `#verify-result` + `document.title='VERIFY PASS n/n'`（或 FAIL）；verify 模式 stub 掉 `KIDS.audio.note/sfx/speak/voice.play/voice.queue`。另暴露验收钩子（`window.GAME` 或具名全局，见各节），供主会话真实操作模拟。
- **无字面 `</script>`**（写 `<\/script>`）；无任何 http(s) 引用；`touch-action:none` 于游戏容器。
- **目录结构**（照抄第一批 shop/kitchen 模式）：`batch2/<game>/index.html`（成品）+ 源码目录 + `build.py`（core 拼接 + 预留 `from inject_clips import clips_js; clips = clips_js('<game>')` 注入行——clips 目录此刻不存在，build 里 **try/except ImportError 降级为空字符串**，主会话补管线后重建）+ `README.md`（50 行内）。
- 卡面/图形全部内嵌 SVG，描边统一 2.5px 暖棕 `#4A3B2E`，色板沿用 spec §8。

## 1. 记忆翻牌配对（memory）

**玩法**：网格牌面朝下，点击翻牌；翻第二张后：图案相同→配对收走（coin 音+缩小飞出），不同→停 900ms 让孩子看清后盖回。全部配对=过关（celebrate+星级），5 关=1 章。

- 难度：第 1 章 2×3(3对)→2×4(4对)→3×4(6对)；第 2 章 3×4/4×4；第 3 章起 4×4(8对)与 4×5(10对) 交替（生成关）。
- 图案池 12 种内嵌 SVG：小猫/小狗/小熊/小象/小青蛙/苹果/香蕉/梨/橙子/花/星星/爱心（风格与第一批 GOODS/rabbit 一致，圆润无尖角）。
- 无限生成：静态 20 关（4 章）+ `genLevel(flat)`：图案子集选取+洗牌全走 mulberry32(flat*7919+13)，保证每图案恰好 2 张。
- 星级：失误（不匹配翻牌）次数 ≤ 对数×1.5=3 星；≤对数×2.5=2 星；否则 1 星。永不 0 星。
- 支架：连续 3 次失误后，若场上有已翻过又盖回的已知配对→幽灵手指指向其中一张（复用 pipe 的 ghostDemo 思路）；5 秒无操作重演示一次。
- 教学（仅 1-0）：看=自动翻一对配对演示；帮=高亮第一张；独=孩子完成。
- 语音文案（key / text）：`mem_tut_watch`『看！翻一翻，找到一样的两张』、`mem_tut_turn`『现在你来试一试』、`mem_hint`『找到一样的两张』。
- 验收钩子：`window.MEM = { get currentLevel, get cards(), flip(i), autoSolve() }`——cards 返回 [{id, pattern, state}]，flip 模拟点击第 i 张，autoSolve 用完美记忆策略返回翻牌序列并执行。
- verify=1：①全部生成关结构校验（图案恰好成对、网格尺寸合法）②autoSolve 跑通静态 20 关+生成关 5 关抽查（每个都在限步内完成）。

## 2. 七巧板拼图（tangram）

**玩法**：下方托盘散放 7 块（或前几章子集）七巧板块，上方虚线目标轮廓。**拖动=移动；无位移短按（pointerup 时位移 <8px）=旋转 45°**。块接近正确位置（中心距 < 格距 35%）且旋转等价（模 360 相等，计入形状对称等价）→吸附（咔哒音+落位动画）。全部就位=过关：轮廓线稿变彩色成品画+小兔子庆祝。

- 七巧板经典分割：正方形边长 480（内部坐标）切 7 块（2 大三角/1 中三角/2 小三角/1 正方/1 平行四边形），块用亮暖色区分（同 spec §8 色板）。
- 难度：第 1 章 2-3 块（小山/小旗/火箭）；第 2 章 4-5 块；第 3 章起 7 块经典形（房子/小鱼/帆船/小猫/蜡烛/天鹅/奔跑兔子/桥）；生成关=模板库 12 形+确定性起始旋转与散布位置。
- 无限生成：静态 20 关 + mulberry32(flat*7919+13) 选模板与打乱。
- 星级：多余操作（点转+拖放总次数 − 最少次数）≤2=3 星；≤5=2 星；否则 1 星。
- 防挫败：块永不"放错锁死"（不吸附就是没到位，拿起来重放）；某块闲置 25 秒→轻微高亮它的目标轮廓区（提示不代做）。
- 教学（仅 1-0）：看=自动把第一块从托盘吸到目标；帮=幽灵手指指向下一块；独=完成。
- 语音：`tan_tut_watch`『看！把图形放到虚线里』、`tan_tut_turn`『你来试一试，转一转放进去』、`tan_hint`『转一转，放到一样的形状里』。
- 验收钩子：`window.TAN = { get currentLevel, get pieces(), rotate(i), place(i, x, y), autoSolve() }`。
- verify=1：①每关模板结构校验（块集合=模板解，无重叠无遗漏覆盖轮廓）②吸附判定单元校验（对/错位置样本各 6 例）③autoSolve 全模板跑通。

## 3. 涂色本（color）〔r6 难度改造 2026-09-13：本章 v1 玩法仅 ch1 沿用——r6 真值源=§5，v1 原文留档〕

**玩法**：线稿图（内嵌 SVG，闭区域 6-15 个）居中；底部调色盘 12 色（大色块 ≥56px，间距 ≥16px）；点色→点区域填色（即时+pop 音）；顶部"撤销"大按钮（≥64px）与"完成"按钮。全部区域已填=完成：庆祝+小兔子举画；已填 ≥60% 也可点"完成"提前过关（1-2 星）。每张画=1 关，5 张=1 章。

- 线稿库 10 张：花/蝴蝶/小鱼/房子/小兔子/气球/大树/太阳/小船/蛋糕（几何简洁、闭区域清晰、线条 3px）。
- 无限生成：静态 20 关（4 章，库内 10 张两轮复用但配不同推荐色）+ 生成关=随机底图+确定性"推荐配色"任务（不强制，任意色填满都算过关；推荐色只是引导）。
- 星级：全部区域填满=3 星；≥60%=2 星；点了"完成"但 <60%=提示"还有空白哦"不算失败（撤销继续或再填）；星 1 星=填 ≥40% 时点完成。永不 0 星、永不失败。
- **自由画布**（首页第二入口）：白板+画笔（手指/鼠标直接画，线条圆头 12px）+同款调色盘+橡皮+粗细 3 档+清空（**长按 1 秒才清空**，防误触，按钮上画小闹钟提示）。不计关卡不入档。
- 撤销栈：≥30 步；撤销的是区域填色/画笔笔画（自由画布）。
- 防挫败：点已填区域=换色重填（覆盖，不惩罚）；无倒计时。
- 教学（仅第 1 张）：看=自动选红色填一个区域；帮=高亮调色盘当前色；独=填满 2 个区域后放手。
- 语音：`col_tut_watch`『看！点颜色，再点图画』、`col_tut_turn`『你来挑一个颜色吧』、`col_hint`『点颜色，再点图画』。
- 验收钩子：`window.COL = { get currentLevel, get regions(), fill(i, colorIdx), done(), undo(), freeDraw(x1,y1,x2,y2,colorIdx), clearFree() }`。
- verify=1：①每张线稿区域表完整性（区域数=SVG 闭路径数、id 唯一）②程序自动填色全部区域→完成态断言（静态 20 关+生成 5 关抽查）③撤销/覆盖填色单元校验 ④自由画布笔画渲染冒烟（画 3 笔断言 canvas 非空白）。

## 4. 主会话集成验收（三款上线门禁，照抄 batch1 协议+新增）

1. `?verify=1` 全 PASS 才继续
2. playwright 真实操作通关：memory 真实点击翻牌完成第 1 关；tangram 真实拖放+点转完成第 1 关（含一次故意错位）；color 点色填区域完成第 1 张
3. 双 viewport（1280×800 / 800×1180）：overflowX=0、触摸目标 ≥64px（家长按钮豁免）
4. 完全离线检查 + 截图像素非空白
5. 章 1 基、日历 limit、家长门+手动加关 E2E（core 级，一款抽测即可）
6. 语音管线（主会话做）：文案提取→合成→注入→verify_voice 专项

## 5. 涂色本 r6 难度改造版本块（2026-09-13 定版——§3 v1 原文留档，本块为 ch2-ch4+生成关真值源）

**改造背景（审计红款 #6）**：v1 零判定零失败纯涂色——任意色填满即 3 星，推荐配色不强制，3 岁级创意玩具无挑战。
r6 目标：单关净时长 ≥40s（5-6 段）且思考占比可证（每图 ≥2 个真决策）；自由涂色保留为 ch1 底座（机制零改动）。

### r6 玩法真值（delta 逐项）
- **delta① match 参考图记忆配色（ch2 flat5-9，核心）**：左侧 `#ref-box` 缩小成品参考图（pics 0-4，base 推荐配色=判定答案）；
  **首次填涂尝试（无论对错）即隐藏参考图**（`.hidden` → display:none，记忆负荷；verify 负向断言防退化回全程可见）；
  逐格判定制：对色落定（regions[i].fill 落值）、错色拒收（格子回空白 + 900ms 位置闪烁高亮 `.wr`，**不泄正确颜色**）+
  miss+1 + toast「这一格的颜色不一样哦」（clr_match_wrong）方向锚。调色盘 12 色全量。全格对=自动过关。
- **delta② mix 限定调色调出目标色（ch3 flat10-14）**：调色台 `#mixbar` 仅红(0)/黄(2)/蓝(6) 三原色大钮（68px），
  点两色=一次混合操作（两次 tap），结果查封闭表（见下）；**当前目标桶制**——`#target-bucket` 显示当前目标色
  （targets 顺序 seeded），命中=该目标色全部标记区 staggered 填充+目标推进；未命中（含表外同色对）=miss+1+
  toast「再试试别的两个颜色」（clr_mix_wrong）。非标记区按 base 推荐预涂为画面上下文（不可交互，
  `#art` pointer-events:none）。标记区叠色滴圆 `.tg`（pointer-events:none）。
- **delta③ pat 规律涂色（ch4 flat15-19）**：`#strip` 10 格圆珠（72px），**前 3 格预涂**（第 4 格起自己推）；
  调色盘仅给规律用色子集（unique(period)，AB=2 色/ABC=3 色）；对色落定、错色拒收+miss+1+900ms 闪烁+
  toast「看看前面几格的顺序」（clr_pat_wrong）。生成规律：lv3-4（flat18-19）seeded 生成非固定 3 套。
- **delta④ 自由涂色保留（ch1 flat0-4）**：v1 机制零改动（含教学/完成阶梯/撤销/wip 暂存/hitaid），
  仅在章结构中定位为 ch1 底座；mini-preview 参考小图全程可见（"参考图全可见"教学相位）。
- **章结构**：ch1 free+参考图全可见 → ch2 match 记忆配色 → ch3 mix 调色 → ch4 pat 规律+生成 →
  flat≥20 生成关混排（mv 首抽 1/3 分段：mv<1/3 match / <2/3 mix / else pat，内容续用同一流）。
- **新模式星级=miss 口径**：0→3★ / ≤2→2★ / else 1★；全对 800ms 自动过关（verify 模式 spd=0 即时）。
  free 关星阶梯（100%/≥60%/40-60%+提示）不变；完成/撤销按钮仅 free 关显示（新模式无"提前完成"语义）。
- **单关决策数（可证结构量）**：match=区域数（6-10 格格皆决策）；mix=3 目标（每目标一次真混合决策）；
  pat=7 填格（第 4-10 格）。均 ≥2 真决策。

### r6 封闭表（verify 内自本块文字独立重列，禁引引擎常量互证）
- **混色公式封闭 6 条**（key=入缸顺序对，值=COL_PAL 色号）：红+黄=橙 `0+2→1` / 黄+红=橙 `2+0→1` /
  黄+蓝=绿 `2+6→3` / 蓝+黄=绿 `6+2→3` / 红+蓝=紫 `0+6→7` / 蓝+红=紫 `6+0→7`；
  **表外组合（三原色下=同色对 0+0/2+2/6+6）=错混**（miss+方向锚，无结果色）。
- **参考图库**：ch2=COL_PICS 0-4（flower/butterfly/fish/house/rabbit）× COL_REC.base；
  gen match=seeded picIdx×seeded 子色板 rec（v1 生成配色机制原样）。
- **规律模板**：固定 3 套 lv0-2=`[0,2]`(AB 红黄) / `[0,6,3]`(ABC 红蓝绿) / `[1,1,7]`(AAB 橙橙紫)，cells=10、pre=3；
  生成体（lv3-4 与 gen pat）：plen=rnd()<0.5?2:3 → plen=2:ABC 池洗 2 色；plen=3:rnd()<0.5?池洗 3 色(ABC):池洗 2 色 c2 取 [c2,c2,c2[1]](AAB)；
  取色池 `[0,1,2,3,5,6,7,8]`（高区分 8 色）。

### r6 RNG 取数序定版（verify 同式副本对账）
- 通用种子 `mulberry32(flat*7919+13)`（v1 约定沿用）；洗牌=Fisher-Yates（i 从尾往前，j=⌊rnd()·(i+1)⌋）。
- ch3/flat<15：rnd 直入 mix 体：picIdx=⌊rnd()·10⌋ → 目标顺序=洗([1,3,7]) → counts=[1+⌊rnd()·2⌋]×3（每目标 1-2 区）→
  区域索引=洗(0..n-1) 取前 Σcounts → 依序分配（第 t 目标 counts[t] 个区）。
- ch4 lv3-4/flat<20：rnd 直入 pat 体（上节生成体）。gen flat≥20：mv=rnd() 首抽选模式，内容续同一流
  （gen match 体=v1 取数序：picIdx → nSub=3+⌊rnd()·3⌋ → sub 去重循环 → rec 逐区）。
- 确定性契约：同 flat 永远同关（verify 断言 flat0-19 全量 + gen 20-59 全量）。

### r6 时序分账（名义值算术，单关净时长 ≥40s 硬指标）
- **match**：8 区域（ch2 均值）× 5.0s/格（参考图记忆比对+12 色选色+点击）= 40.0s。
- **mix**：intro 横幅窗 4395（estMs(11)·mix intro 11 字，非阻塞）+ 3 目标 ×（决策窗 6.0 + 2 tap×1.2 + 填充反馈 1.5）+
  错混裕量 2×（锚点 toast 1900 + 重选 3.0）= 40.8s。
- **pat**：7 填格 × 5.7s（规律推导：回看前 3 格→周期延推→选色→点击）= 39.9≈40s（首格决策最重，后程递减）。
- 交叉校验锚：estMs 家族=n·345+600（r4 m-5 定版，禁 +300 变体）——源字面（game.js）/build.py 断言/
  verify 数值断言（estMs(1)=945、estMs(11)=4395、estMs(12)=4740）/本 SPEC 四处同步。

### r6 语音（manifest 真值源=voice/gen_clips.py；既有 clip 文本禁改）
- 新 6 键（clr_ 前缀，已核 manifest 无占用；col_ 旧三键 games 字段被 batch22 colormix 历史覆盖，color 侧 TTS 兜底照旧）：
  clr_match_intro「看看小图，涂出一模一样的」/ clr_match_wrong「这一格的颜色不一样哦」（delta 定死原文）/
  clr_mix_intro「两个颜色抱一抱，变出它」/ clr_mix_wrong「再试试别的两个颜色」（delta 定死原文）/
  clr_pat_intro「看看前面的顺序，接着涂」/ clr_pat_wrong「看看前面几格的顺序」（delta 定死原文）。
- 播报门限（对 §0 flat<3 约定的 r6 增量，colormix b22 sayR 先例）：三 intro=章首关（flat5/10/15）或会话内首遇播一次
  （横幅窗=estMs(文本长)，pointer-events:none）；三 wrong 锚点=全关可播（方向锚反馈必须可听）；
  v1 col_* 三键仍 flat<3（sayP）；idle 20s 提示按模式选 intro 句。
- **SPEC_DUR r6 真值表**（无头 chromium Audio.metadata 实测 2026-09-13，两次复测一致；verify ±60ms 断言）：
  clr_match_intro=3216 / clr_match_wrong=2568 / clr_mix_intro=3072 / clr_mix_wrong=2592 /
  clr_pat_intro=3168 / clr_pat_wrong=2640（ms）。

### r6 布局定案（双 viewport 1280×800 / 800×1180 实测）
- `#play-body` 包参考图+画布：≥900px 宽左右排（ref-box 210px 左置，实测 230×230）；<900px 上下排（ref-box 150px，实测 162×162）。
- 非新模式元素负向可见性：match 关 `#mini-preview`/`#btn-done`/`#btn-undo` display:none（mini 防泄底）；
  mix 关 `#palette` display:none、`#art` pointer-events:none；pcell 72px/mprim 68px 均 ≥64 触摸目标。

### r6 verify 单元（?verify=1，62 checks）
v1 单元全保留（lib:10 + rec:10 + lv:0-4 + undo:4 + done:ladder/flow + free:2 + layout + hit:10）+ r6 新单元：
r6:dispatch（0-19 模式分派+确定性）/ r6:gen（20-59 确定性+三模式覆盖=分支可达）/ r6:replica（生成参数独立副本对账）/
r6:pat-seed（lv3-4 副本）/ match:judge（错拒+参考图隐藏负向断言+toast 文案）/ match:win2 / match:stars /
mix:table（封闭表 9 组合独立对账：6 条+3 同色对）/ mix:win / mix:stars / pat:judge（先错后对逐格+miss 计数）/
pat:win / pat:aab / r6:gen-win（生成三分支真实通关）/ r6:layout（bbox+负向可见性）/ r6:estms / r6:clips / r6:dur。

### r6 验收口径（本批实际执行）
重建（build.py 含 r6 断言）→ _selftest.py 64 项（双 viewport verify 62/62×2 + free 教学流 + 章末/日完含 flat5 match
+ 三新模式真实点击通关（故意错路径+toast+参考图隐藏）+ 自由画布 + 双 viewport 布局）→ verify_batch2.py 姊妹回归
（memory/tangram/color）→ 无头 verify 复跑双绿。
