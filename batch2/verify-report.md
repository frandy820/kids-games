# batch2 集成验收报告

时间：2026-09-13 15:05:42

| 游戏 | 检查项 | 结果 | 说明 |
|---|---|---|---|
| memory | ?verify=1 自检 | PASS | VERIFY PASS 27/27 |
| memory | 真实翻牌通关(第1关) | PASS | celebrate 出现 |
| memory | 截图非空白 | PASS | stdev=6.0 |
| memory | 桌面1280 无横向溢出 | PASS | overflowX=0 |
| memory | 桌面1280 触摸目标>=64px | PASS | [] |
| memory | 完全离线(无http引用) | PASS | [] |
| tangram | ?verify=1 自检 | PASS | VERIFY PASS 28/28 |
| tangram | 真实拖放通关(第1关) | PASS | celebrate 出现 |
| tangram | 截图非空白 | PASS | stdev=6.1 |
| tangram | 桌面1280 无横向溢出 | PASS | overflowX=0 |
| tangram | 桌面1280 触摸目标>=64px | PASS | [] |
| tangram | 完全离线(无http引用) | PASS | [] |
| color | ?verify=1 自检 | PASS | VERIFY PASS 62/62 |
| color | 真实填色通关(第1张) | PASS | celebrate 出现 |
| color | 截图非空白 | PASS | stdev=32.9 |
| color | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| color | 平板800x1180 触摸目标>=64px | PASS | [] |
| color | 完全离线(无http引用) | PASS | [] |
| memory | 家长门(两位数加法+进面板) | PASS | 题=18+22 |
| memory | 家长手动输入加关(填5→limit=11) | PASS | limit=11 bonus=5 |
| memory | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| memory | 平板800x1180 触摸目标>=64px | PASS | [] |
| tangram | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| tangram | 平板800x1180 触摸目标>=64px | PASS | [] |
| color | 平板800x1180 无横向溢出 | PASS | overflowX=0 |
| color | 平板800x1180 触摸目标>=64px | PASS | [] |

**合计：PASS 26 / FAIL 0**

截图目录：batch2/shots/