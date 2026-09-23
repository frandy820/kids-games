# 形状分家 shapeshome（batch11）交付报告

日期：2026-09-07（最终复验）｜产物：`batch11/shapeshome/index.html`（单文件 266,850 bytes，完全离线）

## 1. verify 计数（?verify=1）

**VERIFY PASS 50/50**（document.title，selftest 轮询 ≤15s 捕获）：

| 单元 | 计数 | 结果 |
|---|---|---|
| ① 40 关全量审计（flat 0-39） | 40 | 全过：确定性（同 flat 两跑 JSON 一致）/ 章维度（dch1 dim=color 家恒圆、dch2 dim=shape tc=null、dch3 双维、dch4 双维+tc∈近似色域）/ 干扰只对一维（dch3/4 第 2 题起恰一同色异形+恰一同形异色）/ 近似色域（dch3 异色非近似、dch4 同形异色必 isNearPair）/ 首题热身（dch3/4 两干扰两维全错且色形互异）/ structOk（三卡互异·恰一 match·answerIdx 有效）/ 相邻题目标避重 / 引擎直驱 0 错 3 星 |
| ② 覆盖 | 1 | tc: 6 色全出现（red30/yellow16/blue22/green20/orange32/purple30/null50=章2 无色维）；ts: circle94/square35/triangle35/star36；dch：静态 20 关 1-4 各 5 恒定 + 生成 20 关随机全覆盖（**审查 M1 修复**：原实现生成关循环取材违 SPEC，已改 `flat<20 ? diffOfCh : ri(rnd,1,4)` 随机——shadow/sortsize 同口径，覆盖计数随确定性序列变化，见重跑值）；answerIdx 三位置均出现 |
| ③ 点选单元 | 1 | 首错灰掉 pointer-events:none + 零惩罚不 pulse；再点已灰返 'again'；二错正确卡 pulse；灰化封顶 2（两干扰全灰后点对推进）；非法下标 false |
| ④ sayW 三态 | 1 | flat0 两错=2（每错必播）；flat3 重发节流=1；flat3 同题两错豁免=2（miss≥2 force） |
| ⑤ 教学链 | 1 | 看→tutSeen 写档→重发 step=0→帮（turn 后题面 TTS 接力到达） |
| ⑥ clipOk | 1 | shp×3 + core×3 注入在场 |
| ⑦ 开场链 | 1 | play(shp_hint) 时间戳先于 say(题面)；replay() 直通 |
| ⑧ 吞输入轻反馈 | 1 | locked 期真实 pointerdown → sfx('pop') + step/retries/miss 不变 |
| ⑨ 双 viewport 布局 | 1 | 1280×800 + 800×1180 × flat[0,10,15,20] 共 8 模拟全过：卡≥96、按钮≥64（.k-parentbtn 豁免）、卡图形 SVG≥64、家内目标图形≥56、overflowX≤0 |
| ⑩ UI 冒烟 ×2 | 2 | flat0 首错零惩罚+1 错=2 星；flat10 章 3 双维热身+只对一维断言+autoSolve 3 星 |

## 2. 无头真实点击通关证据（playwright 独立 chromium.launch，等 5.2s 后读档）

| 关 | 场景 | 存档证据 | 演出链证据 |
|---|---|---|---|
| 第 1 关 flat0（章 1 单维颜色） | 首题先错一次再点对，后续 4 题全对 | `levels['1-0'].stars = 2`（1 错=2 星），随后自动推进 flat=1 | `.k-celebrate` 弹出且星数=2；首错卡灰掉+正确卡无 pulse |
| 第 11 关 flat10（章 3 双维） | 种档 range(10) 跳入；第 1 题手动点对后 4 题循环 | `levels['3-0'].stars = 3`（0 错=3 星） | 热身题两干扰两维全错实测（tc=red/ts=star，干扰 purple+square / green+circle）；第 2 题起恰一同色异形+恰一同形异色实测 |
| 教学（全新存档） | 乱点→看→帮→独 | `shp.tutSeen=true` 持久化 + `levels['1-0'].stars=3` | 乱点被吞：sfx=['pop']，flat/step/retries 不变；幽灵手指出现并指向正确卡 |
| 救援 flat3 | 真实错点后静置 13.6s | — | 错点未重置救援钟，~14s 重读题面（say 记录×2 含 '找一找…'）+ 正确卡 .breathe 循环在屏 |

其他：双 viewport 真实页面 overflowX=0、svgMin=92/86、homeShape=95/80、截图像素 stdev=24.5/22.3；全程 0 http(s) 请求、0 pageerror。

## 3. 自测抓到并修掉的缺陷

1. **家内目标图形显示尺寸不足**（自查发现）：`.hshape` 缩放 0.82 时图形实际 bbox <64px 断线 → 三处（CSS 静态/keyframes/SVG attr）统一改 scale(.92)，verify 增加家形 ≥56 断言（实测 95/80）。
2. **verify ⑦ 开场链断言恒真**：原写法 `pLog.indexOf(...) < sayLog.length` 永远成立 → 改为时间戳记录（[key, Date.now()]），断言 tSay > tPlay。
3. **verify ④ sayW 计数被段间污染**：flat3 节流段/豁免段计数 =3/5（期望 1/2）——playLog 跨段累计 → 段间清空 playLog + 重置 lastWrongVoice。
4. **selftest 第 11 关断言写错**：存档 key 误用 '3-1'（第 11 关=章 3 第 1 关，实为 '3-0'）且 clicks 误判 4 为异常 → 改 key '3-0' + clicks==4（1 次手动推进+4 次循环）为正常。

（1 为产品缺陷，2-4 为自测脚本自身缺陷，均已修复并全量复跑。）

## 4. 视觉审查（截图 analyze_image，2026-09-07 补做）

- 1280×800：家卡完整（山墙圆窗内紫色三角目标图形）、3 张图形卡等距、零文字、无重叠截断、底栏三按钮齐全 —— 通过。
- 800×1180：房体/三卡/三按钮完整、无溢出无横滚、零文字、布局协调 —— 通过。

## 5. 遗留风险

- **动画未逐帧人工复核**：飞行入家、亮灯、pulse、breathe 等动效经真实点击链路走通（celebrate/写档时序正确），但基于静态截图+几何断言，未逐帧视觉验证。
- **TTS 听感未验收**：题面拼句（“找一找，绿色的圆形”）走系统 TTS，自测中发声 API 已 stub，自然度依赖设备 TTS 引擎，未做真实听感评估。
- **真机未测**：触摸目标为几何断言（≥64/≥96），未在 iPad Safari 真机验证。
- **低端设备演出时序**：SPEED 提速仅用于 verify；低端机上 980ms 演出窗与音频接力时长未实测。

## 6. 复验入口

```
python batch11/shapeshome/_src/build.py        # 重建（clips 注入失败会 sys.exit(3)）
python batch11/shapeshome/_src/_selftest.py    # 43 项自测（约 2 分钟）
# 浏览器打开 index.html?verify=1 → title 应为 VERIFY PASS 50/50
```

源文件：`_src/{head.html, game-data.js, game-core.js, game-main.js, game-verify.js, build.py, _selftest.py}`，截图 `_src/_shots/`。
