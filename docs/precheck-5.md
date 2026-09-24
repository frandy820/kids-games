# 5 款游戏非儿童技术预检报告

- 日期：2026-09-24
- 执行方式：Playwright（Python 3.12.4，playwright sync API）独立 Chromium headless 145.0.7632.6，串行执行，file:// 直开
- 静音措施：每个 context 挂 init_script（Audio.prototype.play 播放 1500ms 后派发 ended、pause 置空），对该 context 下所有页面每次导航生效
- 超时设置：每页 goto 120s 兜底；VERIFY 页 title 等待窗 300s
- 性质：只读预检，未修改任何游戏/入口文件；未做儿童向试玩驱动

## 通用执行命令

```bash
python precheck5.py <game-key>   # <game-key> ∈ hidecup|soundcount|calendar|cbx|robotdance
```

脚本动作（每款）：
1. goto `file:///F:/claudecode/projects/active/kids-games/<batch>/<game>/index.html`（正常模式）→ 观察 3 秒 → 记录 title / body.innerHTML 长度 / 根节点 / pageerror
2. 同页 querySelector 探测暂停/返回常见选择器 + 扫 button/[role=button]/a 文本与 aria-label 含「暂停/返回/退出/目录/首页/回主」
3. goto 同路径 `?verify=1` → 轮询 title 至前缀 `VERIFY PASS` 或出现 FAIL 或 300s 超时 → 记录 N/N 与耗时
4. goto 根 `index.html` → `a.card[href="<相对路径>"]` click 进入该款 → `go_back()` → 确认回到根入口且根入口 body 正常

---

## 1. hidecup（躲猫猫杯子，5-6 岁）

- URL：`file:///F:/claudecode/projects/active/kids-games/batch34/hidecup/index.html`
- VERIFY URL：同路径 + `?verify=1`
- 文件存在：是（413.2K）

| 检查项 | 结果 |
|---|---|
| 启动 title | 「藏猫猫摄像头」（非空） |
| body.innerHTML 长度 | 397,394（>500） |
| 根节点 | `#game` 在场 |
| pageerror（3 秒观察窗） | 0 |
| VERIFY 门禁 | `VERIFY PASS 15/15`，耗时 46.0s |
| 暂停/返回 UI | 无：常见选择器（.k-pause/#btn-pause/.back/.k-back 等 21 种）零命中；扫描 3 个按钮/链接元素，无含「暂停/返回/退出/目录/首页/回主」文本或 aria-label 的控件 |
| 退出通道 goBack | 通过：根入口卡片 `a.card[href="batch34/hidecup/index.html"]` 点击后 URL 进入该款，goBack 后回到 `index.html`，根入口 title「小兔子的游戏屋」、body.innerHTML 133,917（正常） |
| 主入口链接 | 卡片在场且 href 目标文件物理存在 |

- 结算面：结算=VERIFY 门禁覆盖（won/星级断言含于 `?verify=1`），本次未单独驱动
- 异常：无
- 未验证项：结算面未单独驱动（按任务约定引用 VERIFY 结果）

## 2. soundcount（听音数数，5-6 岁）

- URL：`file:///F:/claudecode/projects/active/kids-games/batch33/soundcount/index.html`
- VERIFY URL：同路径 + `?verify=1`
- 文件存在：是（519.6K）

| 检查项 | 结果 |
|---|---|
| 启动 title | 「听音计数」（非空） |
| body.innerHTML 长度 | 506,995（>500） |
| 根节点 | `#game` 在场 |
| pageerror（3 秒观察窗） | 0 |
| VERIFY 门禁 | `VERIFY PASS 61/61`，耗时 48.2s |
| 暂停/返回 UI | 无：常见选择器零命中；扫描 7 个按钮/链接元素，无暂停/返回类文本或 aria-label |
| 退出通道 goBack | 通过：点击卡片进入该款后 goBack 回到根入口，根入口 title/body 正常（133,917） |
| 主入口链接 | 卡片在场且 href 目标文件物理存在 |

- 结算面：结算=VERIFY 门禁覆盖，本次未单独驱动
- 异常：无
- 未验证项：结算面未单独驱动

## 3. calendar（日历小博士，6-7 岁）

- URL：`file:///F:/claudecode/projects/active/kids-games/batch26/calendar/index.html`
- VERIFY URL：同路径 + `?verify=1`
- 文件存在：是（1.5M）

| 检查项 | 结果 |
|---|---|
| 启动 title | 「日历小星」（非空；页面内部名与清单描述名不同，如实记录） |
| body.innerHTML 长度 | 1,524,936（>500） |
| 根节点 | `#game` 在场 |
| pageerror（3 秒观察窗） | 0 |
| VERIFY 门禁 | `VERIFY PASS 57/57`，耗时 13.6s |
| 暂停/返回 UI | 无：常见选择器零命中；扫描 9 个按钮/链接元素，无暂停/返回类文本或 aria-label |
| 退出通道 goBack | 通过：点击卡片进入该款后 goBack 回到根入口，根入口 title/body 正常（133,917） |
| 主入口链接 | 卡片在场且 href 目标文件物理存在 |

- 结算面：结算=VERIFY 门禁覆盖，本次未单独驱动
- 异常：无
- 未验证项：结算面未单独驱动

## 4. cbx（冷静工具箱，6-7 岁）

- URL：`file:///F:/claudecode/projects/active/kids-games/batch40/cbx/index.html`
- VERIFY URL：同路径 + `?verify=1`
- 文件存在：是（1.1M）

| 检查项 | 结果 |
|---|---|
| 启动 title | 「冷静工具箱」（非空） |
| body.innerHTML 长度 | 1,163,207（>500） |
| 根节点 | `#game` 在场 |
| pageerror（3 秒观察窗） | 0 |
| VERIFY 门禁 | `VERIFY PASS 12/12`，耗时 38.8s |
| 暂停/返回 UI | 无：常见选择器零命中；扫描 7 个按钮/链接元素，无暂停/返回类文本或 aria-label |
| 退出通道 goBack | 通过：点击卡片进入该款后 goBack 回到根入口，根入口 title/body 正常（133,917） |
| 主入口链接 | 卡片在场且 href 目标文件物理存在 |

- 结算面：结算=VERIFY 门禁覆盖，本次未单独驱动
- 异常：无
- 未验证项：结算面未单独驱动

## 5. robotdance（机器人学舞，7-8 岁）

- URL：`file:///F:/claudecode/projects/active/kids-games/batch32/robotdance/index.html`
- VERIFY URL：同路径 + `?verify=1`
- 文件存在：是（528.6K）

| 检查项 | 结果 |
|---|---|
| 启动 title | 「兔子机器人学跳舞」（非空） |
| body.innerHTML 长度 | 512,740（>500） |
| 根节点 | `#game` 在场 |
| pageerror（3 秒观察窗） | 0 |
| VERIFY 门禁 | `VERIFY PASS 328/328`，耗时 98.7s（本次实测单元数为 328，任务清单预估 326，以实测 title 为准） |
| 暂停/返回 UI | 无：常见选择器零命中；扫描 4 个按钮/链接元素，无暂停/返回类文本或 aria-label |
| 退出通道 goBack | 通过：点击卡片进入该款后 goBack 回到根入口，根入口 title/body 正常（133,917） |
| 主入口链接 | 卡片在场且 href 目标文件物理存在 |

- 结算面：结算=VERIFY 门禁覆盖，本次未单独驱动
- 异常：无
- 未验证项：结算面未单独驱动

---

## 汇总表

| 款 | 启动（title/根节点/pageerror） | VERIFY N/N + 耗时 | 暂停 UI | 退出 goBack | 主入口链接 |
|---|---|---|---|---|---|
| hidecup | 藏猫猫摄像头 / #game / 0 | PASS 15/15，46.0s | 无 | 通过 | 存在 |
| soundcount | 听音计数 / #game / 0 | PASS 61/61，48.2s | 无 | 通过 | 存在 |
| calendar | 日历小星 / #game / 0 | PASS 57/57，13.6s | 无 | 通过 | 存在 |
| cbx | 冷静工具箱 / #game / 0 | PASS 12/12，38.8s | 无 | 通过 | 存在 |
| robotdance | 兔子机器人学跳舞 / #game / 0 | PASS 328/328，98.7s | 无 | 通过 | 存在 |

## 总体结论（仅陈述实测）

- 5 款启动全过：title 非空、根节点 `#game` 均在场、body.innerHTML 均远超 500、3 秒观察窗内 pageerror 均为 0（含 VERIFY 阶段亦为 0）
- 5 款既有门禁全过：title 均变为 `VERIFY PASS N/N` 前缀，无 FAIL、无超时
- 暂停/返回 UI：5 款款内均未探测到任何暂停/返回/退出/目录类控件（与预期现状「无款内暂停」一致）；退出通道实测为浏览器返回键（goBack 均能从款内回到主入口且主入口 body 正常）
- 结算面：均未单独驱动，以各款 VERIFY 门禁自含的通关断言为准
- 异常清单：空（无异常需复现）
