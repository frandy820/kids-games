# sortsize 大小排排队 — 交付报告

> ⚠ **本报告为 v1 期形态（2026-09-06），已被 SPEC-BATCH11.md §3-r19 难度改造块（09-18）整体取代**——现态以 §3-r19 为唯一真值源，本文件仅作 v1 历史存档，禁作验收依据。（09-19 r19 审查 s-minor-2）

日期：2026-09-06 · 产物：`batch11/sortsize/index.html`（252143 字符，6 条 clips 注入）

## 一、verify 计数

`?verify=1` → title = **VERIFY PASS 48/48**，`#verify-result` JSON `pass==total`、`layoutOk=true`。

- ① 40 关全量审计（flat 0-39，40/40）：确定性（同 flat 双生成 JSON 一致，含生成关 pdch）/ 章型规则（物数 3/4/4/5、档位明显/明显/明显/相近、非混合章恒 big、混合章首题热身 big + 每关 ≥1 small、每关 5 种 emoji 互异）/ structWhy（阶梯档位逐值、两两互异、级差落带 1.4-1.62 / 1.1-1.26、展示非单调、left/pos/answerIdx/miss 自洽）/ 引擎直驱（连错 2 不灰化可重点→排对 'step'→已排位 'again' 零惩罚→逐点后 answerIdx 独立重算器全对→2 错 2 星 + 全对 3 星）。
- ② tapCard 单元：DOM data-size/内联 font-size 与引擎 items 对账、首错晃动不灰掉（pointer-events 保留）首错不 pulse、同卡二错 miss==2 应点卡 breathe、非法下标 false、演出窗源卡 .gone + locked 门拦 hook、槽 lit 按比例缩放（slotSize 精确对账）、'again'、'goal' 换题方向徽章/题面卡翻转。
- ②b sayW 三态：flat<3 每错必播 2 / flat≥3 节流 0 / miss===2 force 恰一次 2。
- ③ 冒烟 A flat0（首题错 1 次 → 2 星，verify 页不弹层）；④ B1 flat10 autoSolve 3 星（方向混合+四物明显档）、B2 flat15 五物相近档真实 tapCard 通关+方向逐题跟随；⑦ 教学链直驱（watch clip→demo→重发同关→queue([sor_tut_turn, TTS 题面])→tut='help'）。
- ⑤ 布局双 viewport ×（三物/四物/五物）×（1280×800 / 800×1180）6 组全过：卡 ≥96（主答案）、槽 ≥64、emoji 不溢出卡、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0、方向示意 4 渐变字+箭头在位。
- ⑥ 专项：SIZE_LADDER 独立字面量对账（34|51|77 / 28|42|63|95 / 47|55|65|77|91）/ 3 条 clip 文本字面量 / 方向句字面量 / sor_* 3 条 clipOk / 开场链与救援拼句单通道 stub / 40 关 8 种 emoji 全覆盖（kindDist cat21 dog23 bear28 rabbit23 apple31 ball26 balloon27 star21）/ 方向分布 big165 small35 mixedLevels21。

## 二、真实通关证据（无头真实点击，独立 chromium.launch，等 5.2s 后读档）

| 关 | 场景 | 存档证据 | 判据 |
|---|---|---|---|
| 1-0 (flat0) | 首题连错同卡 2 次→按应点位逐个真实点击 5 题 | `levels['1-0'].stars == 2`（≥1 ✓；错 2 次=2 星与引擎一致） | ✓ |
| 3-1 (flat11) | 章 3 方向混合：逐题按 SO.quiz.answerIdx（方向随题翻转动态变）真实点击 5 题 | `levels['3-1'].stars == 3`（≥1 ✓） | ✓ |

flat11 实录 orders=['big','big','small','big','small']（首题热身 big、方向混合），每题换题时徽章/题面卡/卡区 data-order 逐题跟随翻转（on_quiz 回调逐题断言）。celebrate 2.3s 收起后写档，读档在 +5.2s。

无头自测 `_selftest.py` 全量 **53/53 PASS**（含 2a/2b/2c/2d、双 viewport 实测、救援钟、离线与 0 pageerror）。

## 三、自测抓到并修掉的缺陷

1. **_selftest.py 双 viewport 4item 测量错位（自测脚本 bug，非游戏 bug）**：循环里 `if flat != 7: startLevel(...)` 想复用预置初始关，但上一轮 3item 已把棋盘切走，4item 实测的是旧 3 卡盘 → 2 FAIL。修为无条件 `startLevel(flat)` 后 53/53。游戏本体渲染全程正确（verify ⑤ 与修后实测一致）。
2. **预判防住的坑（未触发，列入备查）**：verify 页 `KIDS._save()` 返回 null——tutorialWatch 内写 tutSeen 已加 `if (sv)` 守卫；`queue(parts)` 缺 clip 带 text 的段会**丢弃后续段**——全部链中 TTS 段恒放最后；字面 `</script>` 恒写 `<\/script>`（build 硬检查 1）。

## 四、视觉复核（截图 + 字形实测）

6 张截图（`_src/_shots/`，1280×800 与 800×1180 × 三/四/五物）像素非空白（stdev 18-20.7）。VLM 审查提出"四物卡 1/2/4 大小区分度低"——DOM 字形矩形实测推翻：四物明显档渲染字形高 28/42/63/95px（步进 1.50），五物相近档 47/55/65/77/91px（步进 1.17-1.18，两两高差 ≥12%，"相近档要看仔细"即设计意图）。方向隐喻题面用固定的大象→蚂蚁渐变+箭头（不随题 emoji 更换），为 SPEC §3 零文字方向承载的定版设计。

## 五、遗留风险（诚实清单）

1. **相近档（章 4）对部分 5-6 岁儿童偏难**：1.18 步进两两比 12% 视觉差，靠救援（重读方向+三连脉冲）与 miss≥2 breathe 托底；SPEC 定的档位，未降。
2. **flat15（章 4）真实通关由 verify B2 的 tapCard（hook 路径）覆盖**，未另做 pointer 点击场景（2d 只做结构对账）——tapCard 与真实点击共用 uiTapCard 同一路径（2a/2c 已证真实点击通路），风险低。
3. **emoji 跨平台字形差异**：Windows Segoe UI Emoji 与 iPad Apple Color Emoji 度量不同；已用内联 font-size + DOM 字形实测（本机）+ 不溢出断言兜住，未在真机 iPad 验证。
4. **教学 ghost 在 verify 页抑制**（`if (VERIFY) return`）：真实页教学链由自测 2b 全真实链路覆盖（看吞输入→帮幽灵手指→独→tutSeen 持久化），verify ⑦ 仅直驱断言链路。
5. 生成关（flat≥20）随机章参数已确定性可复现，但 **20 关后的长线体验**（同章参数重复循环）未做儿童实测。

## 六、产物清单

- `F:/claudecode/projects/active/kids-games/batch11/sortsize/index.html`（单文件成品）
- `F:/claudecode/projects/active/kids-games/batch11/sortsize/_src/`：head.html / game-data.js / game-core.js / game-main.js / game-verify.js / build.py / _selftest.py / _shots/（6 截图）
