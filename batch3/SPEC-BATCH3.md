# SPEC-BATCH3 — 第三批三款游戏契约（拼音小火车 / 算术小勇士 / 规律侦探）

> 与 design/DESIGN-SPEC.md（v1）、batch2/SPEC-BATCH2.md §0 共同约定共同生效：core 原样内嵌、章号 1 基、limit(Infinity)、确定性生成 mulberry32(idx*7919+13)、sayP 语音前 3 关、verify=1 自检+验收钩子、无字面 `</script>`、无 http(s) 引用、失败零惩罚、无倒计时、主触摸目标 ≥96px 间距 ≥16px、pointerdown 即响应。本文只写增量，冲突以本文为准。
> 面向 **6-7 岁**（幼小衔接/一年级上）。三款均为"点选大按钮"玩法（≥80px），比拖放更贴近课堂练习形态。

## 1. 拼音小火车（pinyin）

**玩法**：小兔子开小火车，每关 4-6 节车厢（大卡片）。按章节玩法不同：
- 章 1（认声母）：语音/箭头指定一个声母 → 点选正确车厢（3-4 选 1，干扰项=形近声母如 b/d/p/q）
- 章 2（认韵母）：同上，干扰项=形近韵母（a/o、iu/ui、ie/ei）
- 章 3（两拼）：车头声母 + 货物图（如"爸"图），从 3 节候选车厢选正确韵母接上 → 拼对火车开动 + 播整音节发音
- 章 4（复韵母/整体认读）：两拼扩展到复韵母；整体认读音节直接选（zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying 16 个）

- **音节库（封闭，写死在 game-data）**：两拼仅用合法组合，约 120 个高频音节；每个音节配 ①代表汉字（配图用，一年级常见事物：bà→爸、mā→妈、mǎ→马、huā→花、gē→哥、tù→兔、yú→鱼、niǎo→鸟、shuǐ→水…）②语音 key `py_syl_<syl>`（text=代表字，主会话预合成注入）。**禁止依赖系统 TTS 读拼音字母**（读不出来）；关卡内示范读音只走 clip。
- 声母 23 / 韵母 24 / 整体认读 16 表写死；干扰项按形近表配置。
- 无限生成：静态 20 关（4 章）+ genLevel(flat)（章内玩法+mulberry32 抽材料）。
- 星级：一关 3-5 小题，全对=3 星；总重试 ≤2=2 星；否则 1 星（错=卡片轻晃+高亮正确项 1.2s 后允许重点，零惩罚）。
- 教学（仅 1-0）：看=自动选一次；帮=高亮第一题正确项；独=完成。
- 语音：`pyi_tut_watch`『看！找到正确的车厢』、`pyi_tut_turn`『你来点一点』、`pyi_hint`『找一找一样的拼音』。
- 钩子：`window.PYI = { get currentLevel, get quiz(), pick(i), autoSolve() }`——quiz 返回当前题 {type, items, answer}。
- verify=1：①音节库合法性（拼合规则枚举校验：声韵母都在表内、无重复）②静态 20 关+生成 5 关抽查结构（每题 answer 在 items 中且唯一）③autoSolve 全部通关。

## 2. 算术小勇士（math）

**玩法**：冒险地图叙事——小兔子沿山路前进一步一题，每关 5 题走完到山顶点亮星星。题目卡片大字（如 `8 + 5 = ?`），下方 3 个答案大按钮（≥80px，含 1 个正确+2 个邻近干扰）；低章可展开**计数辅助**（点"数一数"按钮显示苹果点数图或 0-20 数轴，高亮起点），点错=按钮晃动灰掉 + 数轴辅助自动亮起（不代答），重点即可。
- 难度：章 1 五以内加减 → 章 2 十以内加减 → 章 3 二十以内不进位加减 → 章 4 二十以内进位加/退位减 + 三数连加（和 ≤20）。
- 无限生成：静态 20 关 + genLevel(flat)（按章参数化范围，mulberry32；保证一关内题目不重复、答案不恒在首位）。
- 星级：5 题全对=3 星；总重试 ≤3=2 星；否则 1 星。
- 教学（仅 1-0）：看=自动答一题（含数轴动画）；帮=高亮数一数按钮；独=完成。
- 语音：`mat_tut_watch`『看！算一算，点出答案』、`mat_tut_turn`『你来算一算』、`mat_hint`『数一数，再选答案』。
- 钩子：`window.MATH = { get currentLevel, get quiz(), pick(i), countAid(), autoSolve() }`。
- verify=1：①生成器数学正确性（静态 20 关+生成 20 关全量：题面与 answer 一致、范围合规、无重复题）②干扰项不等于正确答案 ③autoSolve 通关 ④数轴辅助展开冒烟。

## 3. 规律侦探（pattern）

**玩法**：一排图案序列卡片（4-6 张可见）+ 1 张问号卡（缺失在末尾或中间），下方 3 选 1 大按钮。答对=问号翻开+序列从头到尾逐张弹跳回放（强化"规律感"），全关 3-5 题过关。
- 图案池：复用/新做 12 种内嵌 SVG 小图案（形状+颜色双属性，同 memory 风格）。
- 难度：章 1 AB / ABB 重复（单维度）→ 章 2 AABB / ABC / 位置中缺 → 章 3 双维度（颜色与形状各自成规律，如 红圆→蓝方→红圆→蓝方…）→ 章 4 数量规律（每张卡上图案数递增/递减 1-2，如 ★ / ★★ / ★★★ / ?）。
- 无限生成：静态 20 关 + genLevel(flat)（规律模板+材料 mulberry32；干扰项取规律外图案但同池）。
- 星级：同 math（全对 3 星 / 总重试 ≤3=2 星 / 否则 1 星）。
- 教学（仅 1-0）：看=自动答一题+回放；帮=高亮序列前段（指规律起点）；独=完成。
- 语音：`pat_tut_watch`『看！找一找图案的秘密』、`pat_tut_turn`『你来接着摆』、`pat_hint`『看看前面的图案』。
- 钩子：`window.PAT = { get currentLevel, get quiz(), pick(i), autoSolve() }`——quiz 返回 {seq, items, answer, missingIdx}。
- verify=1：①规律正确性程序校验（静态 20+生成 20 关：按规律函数推断缺失项==answer；双维度关两轴分别校验）②唯一性（干扰项≠answer）③autoSolve 通关。

## 4. 目录结构与门禁（照抄 batch2 模式）

- `batch3/<game>/index.html` + `_src/`（head.html / game-*.js）+ `build.py`（core.js 全文拼接 + `from inject_clips import clips_js` try/except 降级）+ `README.md`（≤50 行）。
- 游戏 id：`pinyin` / `math` / `pattern`。
- 实现 agent 交付门禁：`?verify=1` 全 PASS + playwright 无头真实点击通关第 1 关（独立 `chromium.launch()`，禁止 connect/杀任何浏览器进程）+ 双 viewport overflowX=0 + 截图非空白。文案清单（key/text，含全部音节 key）写进各自 `voice-manifest.md` 交回。
- 主会话后续：语音合成注入 → verify_batch3.py 全量回归 → 反方审查 → 入口页年龄分组升级（batch4 后统一做）。
