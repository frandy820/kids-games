# shadow 影子配对 — 交付报告

产物：`F:/claudecode/projects/active/kids-games/batch11/shadow/index.html`（单文件离线，262,715 字节）
源码：`_src/{head.html, game-data.js, game-core.js, game-main.js, game-verify.js, build.py, _selftest.py}`
语音：sha_tut_watch / sha_tut_turn / sha_hint 共 3 条 clip + core_* 3 条（clips_js('shadow') 注入 6 条，注入失败 sys.exit(3)）

## 1. verify 计数（门槛 1）

`?verify=1` → **VERIFY PASS 49/49**（含 layoutOk）

- ① 40 关全量审计（flat 0-39，静态 20 + 生成 20）全绿：确定性（同 flat 两次 JSON 一致）/ 章号 1 基 + 生成关 dch∈[1,4]（实测分布 2/7/4/7，全覆盖）/ structWhy 结构自检 / 干扰约束（ch1 三选一跨组、ch2-4 四选一同组）/ 旋转规格（ch3 qi1-4 恒 90/180、ch2 恒 0、ch4 qi0 热身 0 + qi1-4 混合 ≥1 转 ≥1 不转）/ 首题热身 / 相邻题主互异 / 引擎直驱（连错 2 → 灰化 miss 封顶 → again 早退 → 通关 2 星；另全对 3 星）
- ② tapCard 单元 / ②b sayW 三态（flat0 必播=2、flat3 节流=0、miss 封顶豁免恰一次=2）/ ②c 教学链单元 / ③ flat0 冒烟 / ④ B1 flat10(ch3) / B2 flat17(ch4) / B3 flat5(ch2) / ⑤ 双 viewport 模拟 / ⑥ 分布专项（库 15 项字面量对账、拼句例句、clipOk、开场链、目标全覆盖）

## 2. 无头真实点击通关证据（门槛 2，独立 chromium.launch）

`_selftest.py` → **SELFTEST 42/42 PASS**，关键证据：

| 场景 | 结果 |
|---|---|
| 第 1 关（flat0，预置存档跳过教学）真实点击 | 首错=晃动+灰掉(pointer-events:none)+零惩罚+正确卡不 pulse；5 题通关 → `.k-celebrate` 2 星；等 5.2s 读档 **levels['1-0'].stars=2**（≥1 达标）；自动推进 flat=1 |
| 第 6 关（flat5，章 2）真实点击 | 四选一同组干扰+互异+全零旋转+相邻主互异（引擎与 DOM 双验）；5 题通关 3 星；读档 **levels['2-0'].stars=3**（≥1 达标） |
| 全新存档教学链 | 看：真实点击+hook 全吞（step/retries 不动）+ 轻叮 sfx('pop') 落账 → 帮：幽灵手指可见 → 独通关 → **sha.tutSeen 持久化 + 1-0 写档（3 星）** |
| 救援钟（flat3） | +8s 错点**不重置**时钟（9.5s 处未响）；静置 14s+ → 重读题面整句 TTS（"找一找，谁的影子是气球呀"）+ 正确剪影 breathe 循环 |

## 3. 布局 / 离线 / 稳定性（门槛 3、4）

- 双 viewport（1280×800 + 800×1180）×（ch1 三卡 / ch2 四卡）：overflowX=0；剪影卡=主答案最小 130px（横）/ 114px（竖）≥96；全按钮 ≥64（.k-parentbtn 豁免）；题面卡 131/111px；旋转字形不溢出卡（±8px 容差）；截图 4 张非空白（像素 stdev 23.5-28.9），存 `_src/_shots/`
- 运行时 **0 次 http(s) 请求**（build 后离线扫描 + playwright request 监听双验）
- 全场景 **0 pageerror**

## 4. 自测抓到并修掉的缺陷

1. **Chrome rotate(0deg) 计算值坑**：`transform:rotate(0deg)` 的 computed style 是 `"matrix(1, 0, 0, 1, 0, 0)"` 而非 `"none"`，首轮 verify 47/49——零旋转断言全部误判。修：verify 内加 `noRotCss()` 两者都认。
2. **题面配对态时序**：`chipEl.classList.add('paired')` 原在 flyCard()（首段 await 之后）执行，验收窗内读不到。修：移到 uiTapCard 答对分支的同步前缀。
3. **自测脚本 GBK 崩溃**：detail 值带 emoji（🌞）时 print 直接 UnicodeEncodeError 中断。修：check() 统一 backslashreplace 转 ASCII 再打印。
4. **logo SVG 占位残渣**：初版零宽 stroke 路径无渲染，换成真正的太阳光芒路径。

## 5. 与 SPEC 的出入（需知悉）

- **库 15 项 vs SPEC 写 "16 项"**：SPEC §1 标题写 "SHADOW_LIB 16 项"，但枚举明细为四足 6 + 圆物 4 + 特色 5 = **15 项**。按枚举明细实现 15 项（圆物组恰 4 项 = 1 目标 + 3 同组干扰，与章 2 四选一同组设计自洽）。verify 用 15 行独立字面量表逐字对账。若需补第 16 项请指认条目。
- 救援钟实测 wall=12.9s：lastAct 起点在页面 startLevel（早于挂表 2.5s），14s 阈值判定本身已在页面内验证（9.5s 处 early=0 + 14s 处触发）。

## 6. 遗留风险

- emoji 剪影依赖系统 emoji 字体（离线零资源的设计取舍）；不同平台 emoji 字形有别，但"同款 emoji 变剪影"保证题卡内一致性，辨识不受影响。
- ch3/ch4 旋转剪影的辨识难度在 5-6 岁真实用户中未做真人试玩（本批通病，非本款独有）；热身题（首题不旋转）已按 SPEC 缓冲。
- 语音仅 3 条 clip，题面/纠错/救援全部走 TTS 拼句——TTS 不可用时静默降级为纯视觉（core 既定行为）。
