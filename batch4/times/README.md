# 乘法捕鱼 times（batch4 第二款）

单文件离线 HTML5 游戏，7-8 岁儿童向。池塘里 4 条数字鱼，点气泡数字捕鱼，5 题过关点星。

## 玩法
- 池塘数字鱼 4 选 1：答对鱼被"捕获"（晃落+绿气泡），5 题过关；连加题答对后弹"3+3+3=9 → 也可以说 3×3"转化动画
- 题型三态：①同数连加（章 1 前半，a∈{2,3}×b∈2..5）②乘法（a=章口诀键因数，b∈2..9）③缺因数 ? × a = c（仅难度章 4，每关恰 1 题）
- 鱼群分组图辅助（"看一看"，仅难度章 1-2）：b 组每组 a 条+加号隔开，不标总数不代答；面板覆盖池塘，内嵌答案气泡行保证可作答
- 答错：鱼晃动+灰掉（可重点其它），正确鱼呼吸高亮；低章分组图自动亮起（aidAuto 消耗标记：自动亮起后首次点按钮不关闭，防孩子把救援自己按没）
- 星级：5 题全对=3 星；总重试 ≤3=2 星；否则 1 星（永不 0 星）
- 难度：静态 20 关（4 章×5）按 ×2×3 → ×4×5 → ×6×7 → ×8×9+缺因数；21 关起无限生成，进度章号单调递增、难度章号 (ch-1)%4+1 循环（无软锁）
- 生成器：mulberry32(flat*7919+13)，同关永远同题；同关无重复题；干扰项=口诀近邻/运算混淆规则构造；答案位置四位置轮转（禁恒首位）
- 教学：仅关 1-0 首次（"看"分组逐组点亮+幽灵手点中正确鱼含转化动画→"帮"幽灵手指"看一看"→"独"首次答对放手），存档字段 `times.tutSeen`
- 看护：20 秒无操作轻声提示；教学"帮"5 秒无操作重演示一次
- 语音：仅前 3 关（flat<3），题面读音走 voice.queue 单元 clip 拼接（数字/十/加/乘/等于/几），缺任一 clip 整句 TTS 兜底（见 voice-manifest.md）

## 构建
```
cd batch4/times && python build.py   # head + core.js(全文原样) + clips + data+engine+main+verify → index.html
```
断言：core 含 settle()/queue(parts)；无字面 `</script>`；无 http(s)/外链。clips 注入失败自动降级空串（语音管线就绪后重建即可）。

## 验收
- `index.html?verify=1` → 静态 20+生成 20 关全量审计（确定性/三态数学正确/章因数范围独立审计/关形态/无重复/干扰项独立复算/引擎直驱 3 星）+ 单元 + UI 冒烟（autoSolve/分组图/高章无辅助/aidAuto）+ 布局抽查 + 答案位置分布，title=`VERIFY PASS 48/48`，JSON 在 `#verify-result`
- `_selftest.py`（headless playwright，独立 launch）：verify / 真实点击通关（含错题路径+辅助面板内作答 2 星）/ 教学 看-帮-独 真实链路 / 双 viewport 布局+截图非空白 / 全程零 JS 错误+零外部请求，共 33 项

## 验收钩子
`window.TIM = { get currentLevel{flat,ch,dch,lv,step,retries,done,won,locked}, get quiz(){type,a,b,c,text,answer,items,answerIdx,step,wrong}, pick(i), groupAid(), autoSolve(), get tutorial }`

## 已知限制
- 数字鱼 min 96×96：极小视口（宽 <340px）未测试
- 21 关起生成关难度按四章循环，不再递增
- 语音 clips 未并入 manifest 前为静默无语音（离线要求，无运行时 TTS）
