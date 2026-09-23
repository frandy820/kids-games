# 算术小勇士 math（batch3 第二款）

单文件离线 HTML5 游戏，6-7 岁儿童向。小兔子沿山路冒险，答 5 题登山顶点星。

## 玩法
- 冒险地图：每答对 1 题兔子前进一站，5 题到山顶点亮星星；3 个大答案按钮点选
- 计数辅助（"数一数"）：章 1-2 苹果点数（减法划掉减数）、章 3-4 数轴 0-20 高亮起点+方向弧（不标终点，不代答）
- 答错：按钮晃动+灰掉（可重点其它项），辅助自动亮起提示
- 星级：5 题全对=3 星；总重试 ≤3=2 星；否则 1 星（永不 0 星）
- 难度：静态 20 关（4 章×5）：①五以内加减 ②十以内加减 ③二十以内不进位 ④进位加/退位减/三数连加（和≤20）；21 关起无限生成，按四章循环（ch=(flat/5)%4+1）
- 生成器：mulberry32(flat*7919+13)，同关永远同题；同关无重复题；干扰项=answer±1..3 且 ≥0；答案位置随机
- 教学：仅关 1-0 首次（"看"数轴跳跃演示+自动答一题→"帮"幽灵手指指数一数按钮→"独"放手），存档字段 `math.tutSeen`
- 看护：20 秒无操作轻声提示目标；教学"帮"5 秒无操作重演示一次
- 语音：仅前 3 关（flat<3），键名 mat_tut_watch / mat_tut_turn / mat_hint（见 voice-manifest.md）

## 构建
```
cd batch3/math && python build.py   # head + core.js(全文原样) + clips + data+engine+main+verify → index.html
```
断言：core 含 settle()/queue(parts)；无字面 `</script>`；无 http(s)/外链。clips 注入失败自动降级空串（语音管线就绪后重建即可）。

## 验收
- `index.html?verify=1` → 静态 20+生成 20 关全量审计（确定性/数学正确/章语义独立审计 rangeOk/无重复/干扰项规则/引擎直驱 3 星通关）+ 单元 + UI 冒烟 + 布局抽查 + 答案位置分布，title=`VERIFY PASS 47/47`，JSON 在 `#verify-result`
- `_selftest.py`（headless playwright，独立 launch）：verify / 预置存档真实点击通关（含错题路径 2 星）/ 教学看-帮-独真实链路 / 双 viewport 布局 / 截图非空白，共 27 项

## 验收钩子
`window.MATH = { get currentLevel{flat,ch,lv,step,retries,done,won}, get quiz(){a,b,c,op,text,answer,items,answerIdx,step,wrong}, pick(i), countAid(), autoSolve(), get tutorial }`

## 已知限制
- 答案按钮 min 132×96：极小视口（宽 <340px）未测试
- 21 关起生成关难度按四章循环，不再递增
- 语音 clips 为预生成音频，无运行时 TTS 兜底（离线要求）；manifest 未含 math 条目前为静默无语音
