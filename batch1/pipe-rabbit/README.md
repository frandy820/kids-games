# 管道小兔子（pipe-rabbit）

单文件离线儿童管道拼接游戏。`index.html` 即全部成品（core.js 全文 + 游戏代码 + 关卡数据内嵌），无外部请求。

## 玩法
- 静态 4 章 × 5 关 = 20 关（章 1-2 为 4×4，章 3+ 为 5×4）。点按管件顺时针旋转 90°，
  水龙头 → 花盆 BFS 连通后自动放水（逐格浸润动画）→ 开花 → 小兔子庆祝。
- **无限生成关（2026-09-05 升级）**：静态 20 关之后（第 5 章起）程序生成，永不完。
  生成器先随机铺一条水龙头→花盆的自避免路径（首步向东、直行加权 55%、DFS 回溯保证必成），
  管型由相邻走向推出（直行=I、转弯=L、分叉=T，T 分叉 40% 接第二盆花），再在不压路径/花盆处
  随机放石头——cells 即"解"，加载时照旧随机初始 rot。
  难度曲线（按全局序号 i≥20）：5×4；石头 min(4, 1+⌊(i-20)/8⌋)；T 管概率随章号升（8%→50% 封顶）；
  路径长=格子数 50%-80%。确定性 mulberry32(i×7919+101)，同 idx 永远同关（重玩一致、verify 可检）。
  关卡 key 无限化（keyOf/keysUpTo，与 shop-math 口径一致），日历上限 KIDS.calendar.limit(Infinity)。
- 管件 I/L/T（T 从第 3 章引入），石头障碍从第 2 章引入；静态关由解反向构造，必有多解返回路径。
- 教学关 1-0 为"看-帮-独"三步：首次进入自动演示放水（存档标记 tutSeen，重玩不再演示），
  重置随机 rot 后幽灵手指示范 1 次，5 秒无操作再示范，孩子首次点击即强化反馈。
- 会话结构全走 core.js：每日 6 关日历（不锁死，可重玩旧关）、家长"今日多玩 +3 关"按钮、
  celebrate/chapterEnd/dayEnd、休息提示（13/25 分钟）、家长面板（右上角）。
  第 5+ 章的章节预告为生成文案（"明天有更长的水管迷宫哦"等）。
- 星级：点击数 ≤ ceil(最小旋转数×1.2) = 3 星；≤×2 = 2 星；否则 1 星（永不 0 星、无失败态）。
- 第一档零文字：界面全部图标/图形；指令走 KIDS.speak（TTS）。

## verify 接口
`index.html?verify=1`：静态 20 关做 ①解状态连通断言 ②随机初始 rot 求解 ×3（≤200 步）
③应用返回点击序列后必须真连通（闭环证明）；生成关抽查 i∈{20,25,30,40,60} 加验确定性
（两次生成 deep equal）。管件 ≤11 BFS 最短解；>11 走构造解（逐管转到解 rot，按构造必连通）。
结果 JSON 写入 `#verify-result`，title 置 `VERIFY PASS 25/25` / `VERIFY FAIL`。verify 模式不启动游戏循环、无声。

## 集成钩子
- 管件格 DOM 带 `data-x` / `data-y`；点击=pointerdown。
- `window.PipeSolve(chIdx, lvIdx)` → `[{x,y,times},...]`（对当前随机局面求解；开局即连通时返回任一管 ×4 整圈以触发流程）。第 5+ 章（生成关）同样可解。
- `window.GAME = { currentLevel, cells, rotate(x,y), checkWin() }`。

## 自测结果（2026-09-05 升级后，playwright/chromium）
- `?verify=1`：**VERIFY PASS 25/25**（20 静态 + 5 生成关抽查）；确定性/解连通/appliedWin 全 3/3。
- Node 离线全检：生成 i∈{20..28,30,35,40,50,60,100,500} 全过（结构约束+确定性+可解+应用后连通），最慢单关 0.8s。
- 预置存档（tutSeen+静态全通）→ 开局直接进生成关 5-0（GAME.currentLevel='5-0'）；
  PipeSolve(4,0) 返回序列，真实 pointerdown 点击后 `.k-celebrate` 出现，存档写入 '5-0'（3 星）。
- 双 viewport 1280×800 / 800×1180：overflowX=0；格子 171/152px（≥96 达标）。
- 语法：两个内嵌 `<script>` 块 `node --check` 通过；截图像素校验非空白+VLM 目视核验无重叠错位。
- 测试截图：`_shots/gen-level-5-0.png`（生成关棋盘）、`_shots/gen-level-celebrate.png`（庆祝层）；脚本 `_e2e.py`。

## 已知限制
- 文件内 3 处 `http://www.w3.org/2000/svg` 为 SVG xmlns 命名空间声明（W3C 标识符，非网络请求）。
- chapterEnd/dayEnd 覆盖层关闭无回调，下一关在仪式出现约 3.4s 后台加载，关闭后即见。
- 随机初始 rot 极小概率开局即连通（直接触发过关流程，视为运气奖励）；PipeSolve 对此返回整圈 4 击序列。
- TTS/sound 依赖浏览器能力，无语音环境静默降级（core try/catch）；KIDS.voice 预合成 clips 未注入时全部回退 TTS。
