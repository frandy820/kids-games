# batch1 集成验收报告

时间：2026-09-13 21:14:03

| 游戏 | 检查项 | 结果 | 说明 |
|---|---|---|---|
| pipe-rabbit | ?verify=1 求解器自检 | PASS | VERIFY PASS 25/25 \| {"game": "pipe-rabbit", "levels": {"1-0": {"solutionConnected": true, "solvableTries": "3/3", "appliedWin": "3/3", "maxSteps": 1}, "1-1": {"solutionCo |
| pipe-rabbit | 真实操作通关(第1关) | PASS | celebrate 出现 |
| pipe-rabbit | 真实操作通关(第2关, level=1-1) | PASS |  |
| pipe-rabbit | 第2关截图非空白 | PASS | stdev=6.1 |
| pipe-rabbit | 第1关截图非空白 | PASS | stdev=15.1 |
| pipe-rabbit | 桌面1280 无横向溢出 | PASS | overflowX=0 |
| pipe-rabbit | 桌面1280 触摸目标>=64px | PASS | [] |
| pipe-rabbit | 完全离线(无http引用) | PASS | [] |
| shop-math | ?verify=1 订单状态机自检 | PASS | VERIFY PASS 12/12 \| {"game": "shop-math", "mode": "r6", "total": 12, "pass": 12, "units": {"audit": {"ok": true, "detail": {"bad": []}}, "budgetConstruct": {"ok": true, " |
| shop-math | 真实完成2单 | PASS | 完成 2/2（以存档关数为完成信号） |
| shop-math | 章末通关E2E(第5单→打烊结算→可继续) | PASS | chapterEnd 出现且关闭后存活 |
| shop-math | 跨日日历(昨日首玩→今日上限12=2天x6) | PASS | limit=12 |
| shop-math | 家长门(两位数加法+数字键盘+进面板) | PASS | 题=43+47 面板=True |
| shop-math | 家长手动输入加关(填5→limit=11) | PASS | limit=11 bonus=5 |
| shop-math | 日历基数封顶(第6天→limit=12) | PASS | limit=12 |
| shop-math | 截图非空白 | PASS | stdev=17.5 |
| shop-math | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| shop-math | 平板800x1180 触摸目标>=64px | PASS | [] |
| shop-math | 完全离线(无http引用) | PASS | [] |
| kitchen-rhythm | ?verify=1&auto=1 曲目校验+auto-hit | PASS | VERIFY PASS 3/3 AUTO 28/28 \| {"game": "kitchen-rhythm", "checks": [{"song": 0, "title": "小星星", "notes": 28, "beats": 36, "density": 0.778, "ok": true, "errs": []}, {"song": 1, "ti |
| kitchen-rhythm | auto-hit 完整打完一曲 | PASS | .k-song-end 出现 |
| kitchen-rhythm | 手动模式随机点击无异常 | PASS | 5次hit后存活 |
| kitchen-rhythm | 截图非空白 | PASS | stdev=11.2 |
| kitchen-rhythm | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| kitchen-rhythm | 平板800x1180 触摸目标>=64px | PASS | [] |
| kitchen-rhythm | 完全离线(无http引用) | PASS | [] |
| pipe-rabbit | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| pipe-rabbit | 平板800x1180 触摸目标>=64px | PASS | [] |
| pipe-rabbit | 平板截图非空白 | PASS | stdev=15.9 |

**合计：PASS 29 / FAIL 0**

截图目录：batch1/shots/