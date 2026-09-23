# 涂色本（color）— batch2 第三款（r6 难度改造版）

单文件离线 HTML5 游戏：v1 自由涂色底座 + r6 三新题型（参考图记忆配色 / 三原色调色 / 规律涂色）。

## 玩法（r6 章结构，真值源 SPEC-BATCH2.md §5）
- **ch1 flat0-4 free 自由涂色**（v1 机制零改动）：点色 → 点线稿闭区域填色；全满=3 星、≥60% 完成=2 星、
  40-60% 提示后再完成=1 星；教学"看-帮-独"仅第 1 关。
- **ch2 flat5-9 match 参考图记忆配色**：左侧参考图（缩小成品）首次填涂尝试后隐藏（记忆负荷）；
  逐格判定制——对色落定、错格闪高亮位置不泄颜色（「这一格的颜色不一样哦」方向锚）。
- **ch3 flat10-14 mix 三原色调色**：调色台只有红/黄/蓝，点两色=一次混合，调出当前目标桶的橙/绿/紫
  （封闭表 6 条）；错混/同色对=miss+「再试试别的两个颜色」。非目标区已预涂作画面上下文。
- **ch4 flat15-19 pat 规律涂色**：10 格圆珠条前 3 格预涂，第 4 格起自己推（AB/ABC/AAB，lv3 起 seeded 生成）；
  错涂=miss+「看看前面几格的顺序」；调色盘只给规律用色子集。
- **flat≥20 生成关混排**：mv 首抽 1/3 分段选模式，参数同式 seeded（mulberry32(flat*7919+13)）。
- 新三模式星级=miss 口径（0→3★ / ≤2→2★ / else 1★），全对自动过关；完成/撤销按钮仅 free 关出现。
- **自由画布**（首页第二入口，v1 不变）：白板+3 档画笔+橡皮+长按 1 秒清空；不计关卡不入档。
- 5 关=1 章；celebrate → level.pass → 章末/日完；地图按钮看关卡路线。

## 构建
```
python build.py     # core 全文内嵌（断言 settle()/queue(parts)）+ r6 断言（estMs 字面/六语音键/封闭表）+ clips 注入
python _selftest.py # headless 自测（chromium.launch 无头，不弹窗不杀浏览器）
```
源码在 `_src/`（pics.js 线稿库+关卡层 / game.js 逻辑 / game.css 样式），改后重跑 build.py。

## verify 接口
`index.html?verify=1` → 62 项检查写入 `#verify-result`，title=`VERIFY PASS n/n`。
浏览器钩子 `window.COL`：`currentLevel` / `mode` / `regions` / `miss` / `mixState` / `patState` /
`matchRec` / `refHidden` / `fill(i,colorIdx)` / `mixPick(c)` / `next()` / `autoSolve()` / `done()` /
`undo()` / `freeDraw(...)` / `clearFree()` / `level(flat)`。

## 测试结果（2026-09-13 r6）
- verify：62/62 PASS ×2 viewport（1280×800 / 800×1180）——v1 单元全保留 + 模式分派/确定性/生成副本对账/
  match 逐格判定+参考图隐藏负向断言/mix 封闭表独立对账(9 组合)/pat 固定+生成规律对账/estMs 数值/
  语音 6 键注入+SPEC_DUR 实长 ±60ms。
- headless 真实操作：64/64 PASS — free 教学流、章末+日完（flat5 match 入章流）、三新模式真实点击通关
  （含故意错路径+toast 文案+参考图隐藏）、自由画布全流程、双 viewport 布局（ref/mixbar/pcell bbox）。
- 语音 SPEC_DUR 真值表（Audio.metadata 实测两次一致）：见 SPEC-BATCH2.md §5。

## 已知限制
- col_ 前缀旧三键的 manifest games 字段被 batch22 colormix 覆盖（历史撞名），color 侧走 TTS 兜底照旧；
  r6 新语音用 clr_ 前缀（6 键已注入）。
- 覆盖区域重叠依赖绘制顺序（上层区域先命中），极端边缘点击可能命中视觉相邻区域——儿童场景可接受。
- 生成关 match 配色为算法组合，偶有撞色（判定按 rec 执行，确定性不受影响）。
