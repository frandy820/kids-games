# Task#46 语音全量重合成实施计划

> 目标（用户 09-17 红线）：全部 120 款 keyless 动态拼句全量枚举预合成晓晓自然人声 clip，**彻底删除 speechSynthesis 通道**。2026-09-19 启动（用户催办，黄款 r20+ 让位）。

## 库存（枚举双 agent 已完成，清单见本目录）

| 组 | 覆盖 | keyless 点 | 预估新键 | 干净款 | 大头 |
|---|---|---|---|---|---|
| A（b1-20） | 60 款 | 69（27 款）+key:null 13 | ≈2,030（拆段优先） | 27 款 | read 400/quiz 285/poemfill 270/idiom 164/cipher 64 |
| B（b21-40） | 60 款 | 150（53 款） | ≈1,002 | 7 款 | sentorder 90/errdoc 49/emo 48/teach 44/brk 41 |
| **合计** | 120 款 | **~232 点（86 款待改）** | **≈3,032** | 34 款 | — |

另：B 类命名键未注册 96 键（11+族，最速收益）；兜底死分支 13 处 0 键；死键 poe_line_* 20 清理轮处理。

## 三阶段

### 阶段 1：文案注册+合成（先行，零游戏代码冲突）
- gen_clips.py 中央登记（唯一真值源纪律）：
  a. B 类 96 键（VOICE 表已有键名+文案，直接补登）
  b. 固定句族/key:null 族/数词副本族（清单文案=源码字面）
  c. 拼段族（NUMCN 副本+句式段，shop/money 家族先例）
  d. 动态域族（read 正文/quiz 题干/poemfill 诗行/timecalc 时刻词/spellen 字母串/sentorder 词库）——先写程序化枚举脚本从 game-data 提取封闭全集，再注册
- edge-tts 晓晓合成（幂等，semaphore 可提到 8）
- 验收：manifest 键数对账+clips 实长抽验（duration 辨别器）

### 阶段 2：游戏侧改造（r19 收官后，agent 分批并行）
- 86 款逐点改造：say(x)→play('key') 或 queue 段拼播（keyless 段居链尾铁律 Mj-1 必带）
- 每款：改 _src → build → selftest → 涉及 verify 腿适配
- 批次：~6-8 agent 并行，每 agent 10-14 款（按 batch 相邻分组）
- 兼容陷阱（任务书必带）：错链豁免窗构成式随链长更新（estMs 四方）/clip 时长实长≤estMs 假设须验/queue 弃尾语义

### 阶段 3：core 终结 + 全量门禁（收官）
- design/core.js voice.say() 删除 speechSynthesis 调用（留 log 报警桩）
- 120 款全量 rebuild
- **决定性门禁**：仪表化页面跑全流程断言 speechSynthesis.speak 调用数==0（逐款）
- verify_voice 全量+final 回归链

## 风险

- 组合爆炸点用拆段（拼播自然度可接受——家族 20+ 款既有先例）；拼播段间停顿 150ms 是 core queue 既有节奏
- 3000 键合成量：edge-tts 8 并发 ≈10-15 分钟级，幂等可断点重跑
- 86 款改造是工作量大头——每款改动小（1-5 点），批 agent 并行 2-3 轮可清
- 时长模型联动：全 clip 后 estMs 窗口径重定（345ms/字 SAPI 定版→clip 实长），链窗断言族逐款核
