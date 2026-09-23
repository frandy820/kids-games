# memgrid 记忆矩阵（batch9）

6-7 岁空间工作记忆训练：N×N 网格每题 k 格闪亮 2.5s（章 4 起 2s）→ 熄灭 → 点出刚才亮过的 k 格。
单文件完全离线 `index.html`，KIDS core 由 build.py 原样内嵌，语音 clips（mg_* 4 条 + core_* 3 条）base64 注入。

## 章规格（SPEC-BATCH9 §3）

| 章 | 规格 | k | 闪现 |
|----|------|---|------|
| 1 | 3×3 | 2 | 2500ms |
| 2 | 3×3 | 3 | 2500ms |
| 3 | 4×4 | 3 | 2500ms |
| 4 | 4×4 | 4 | 2000ms |

生成关（flat≥20）= 随机规格（3/4）+ 档内随机 k（3×3→{2,3}，4×4→{3,4}），闪现 2000ms。
cells 互异、均匀随机（mulberry32(flat*7919+13) 确定性，同 flat 永远同关）。

## 两态机制（本款特有）

- `phase='show'`：mg_q 播响 → LEAD(1200ms，顺序链 1900ms) → cells 齐亮 → show ms → 熄灭。期间点格零响应（吞输入，§0.6 同源）。
- `phase='input'`：HUD"记住亮起来的格子"→"点出刚才亮过的"+ x/k 计数；点对=亮起（绿描边+勾），点错=晃动+sayW 计错（不灭不锁零惩罚修正），k 格全亮=题完成。
- 同格重复点错不累计 miss（`wrong` 判重）；首错不 pulse，miss≥2 pulse 一枚未点中的记忆格。
- 星级：错次 0=3★ / 1-2=2★ / 更多=1★。

## 救援钟 7a 变体（SPEC 允许，特此注明）

14s 静置（仅正确推进重置；错点/空白/兔子不重置）→ **重闪一次 cells 0.8s（视觉救援，不吞输入）+ 播 mg_q**。
SPEC §0.7a 口径为"重读题面 qSpeech"；本款题面是视觉位置，重闪比语音更贴题，mg_q 同步提示任务目标。

## 构建 / 自检 / 自测

```
python batch9/memgrid/_src/build.py        # 生成 index.html（含 clips 注入+离线断言）
# 浏览器打开 index.html?verify=1           # title='VERIFY PASS 50/50'
python batch9/memgrid/_src/_selftest.py    # 无头真实指针全链路自测（44/44）
```

verify 50/50 覆盖：40 关审计（确定性/structOk/引擎直驱 3 星）、k/N 分布、两态吞输入+skipShow、
点选单元（首错不 pulse/重复错格不累计/miss≥2 pulse/推进）、sayW 三态、开场顺序链 queue([mg_hint, mg_q])、
getter 拷贝、教学吞输入、双 viewport 布局（网格格 ≥64/overflowX=0）、flat0 首错 2 星与 flat15 autoSolve 3 星冒烟。

## 验收钩子 window.MEMG

```js
MEMG.currentLevel   // {flat, ch, dch, lv, n, step, retries, done, won, solved}（拷贝）
MEMG.quiz           // {N, k, cells[], phase('show'|'input'), picked[], miss, step}（拷贝）
MEMG.tapCell(i)     // 点格；show 期返回 false（吞输入）；'right'/'done'/'wrong'/'again'/false
MEMG.skipShow()     // 测试快进：show 期直跳 input（不亮格、不吞后续点击）；已 input 返回 false
MEMG.autoSolve()    // 自动答完当前关：真实等闪现期结束→逐格点 cells→{done, taps}
MEMG.replay()       // 无视 3s 节流直通重播 mg_q
MEMG.rescues        // 救援触发计数（自测用）
MEMG.tutorial       // 'none'|'watch'|'help'|'solo'
```

- **autoSolve 语义**：input 期逐格点 cells；show 期 tapCell 返回 false——autoSolve 内部已轮询等待
  （真实时长，不猜），外部无须先 skipShow；嫌慢可先 `MEMG.skipShow()` 快进当前题。
- **verify 页**另有 `SPEED=0.12` 提速全部闪现/演出计时（防 verify 总时长爆炸）；verify flat0 走
  freshTut 分支：quiz0 不排开场链（停 show 供两态断言），`skipShow()` 后进入正常循环。

## 文件

```
_src/head.html       DOM/CSS（hud/stage[tip+grid]/dock/ghost/verify-result）
_src/game-data.js    章规格/章文案/HUD 文案/VOICE 表（mg_* 四条与 manifest 逐字一致）/图标
_src/game-core.js    纯引擎：genLevel/genOne/engToInput/engTap/engStars/structOk（无 DOM）
_src/game-main.js    主逻辑：两态闪现/渲染/教学看帮独/救援钟/底栏守卫/钩子
_src/game-verify.js  ?verify=1 自检（50 项）
_src/build.py        单文件拼接（core 原样+clips 注入+离线与 </script> 断言）
_src/_selftest.py    无头真实指针自测（独立 chromium.launch）
index.html           产物（build 生成）
```
