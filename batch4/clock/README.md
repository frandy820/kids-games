# 时间小管家 clock（batch4 第一款）

单文件离线 HTML5 游戏，7-8 岁（一二年级）儿童向。指针钟面认时间、拨针、算经过时间。

## 玩法
- 章 1 认整点/半点：钟面大图 + 3 个数字时间大按钮；干扰=时针近邻 + 半点混淆
- 章 2 认五分钟刻度：任意 ×5 分钟；干扰=镜像读针（2:50 vs 3:10，必含）+ 相邻刻度
- 章 3 拨长针：给出数字时间，拖分针到正确位置（pointer capture + 吸附最近 5 分钟刻度，时针自动联动 h+min/60），松手判定；不到位=指针轻微摆动重试，零惩罚，时针不需拖
- 章 4 经过时间：开始/结束两个钟面（60% 概率跨整点，如 2:40→3:05），"过了多久"3 选 1；干扰=±5 分钟 + 整点混淆（60-dur）
- 每关 5 题；星级：全对=3 星、总重试 ≤2=2 星、否则 1 星（永不 0 星）
- 静态 20 关（4 章×5）+ 无限生成（mulberry32(flat*7919+13)，同关永远同题；进度章号单调递增，难度章号 (ch-1)%4+1 循环）
- 钟面：内嵌 SVG，12 小时刻度（12/3/6/9 位加长），数字 1-12 章 1-2 显示、章 3-4 淡显
- 教学：仅关 1-0 首次（看=自动答一题→帮=高亮正确项→独），存档 `clock.tutSeen`；章 3 首进演示拖针动画一次，存档 `clock.dialSeen`
- 看护：20 秒无操作轻声提示；教学"帮"5 秒无操作重演示一次；语音仅前 3 关（flat<3）

## 构建
```
cd batch4/clock && python build.py   # head + core.js(全文原样) + clips + data+engine+main+verify → index.html
```
断言：core 含 settle()/queue(parts)；无字面 `</script>`；无 http(s)/外链。clips 注入失败自动降级空串（语音管线就绪后重建）。

## 验收
- `index.html?verify=1` → 静态 20+生成 20 关全量审计（确定性/钟面角度与 clockMin 一致/answer 唯一/干扰规则含章 2 镜像/引擎直驱 3 星通关）+ setDial 正负例各 4 + autoSolve 三题型 UI 通关 + DOM 针角一致 + 布局（钟面 ≥200、按钮 ≥80）+ 答案位置分布，title=`VERIFY PASS 47/47`，JSON 在 `#verify-result`
- `_selftest.py`（headless playwright，独立 launch）：verify / 错题路径真实点击通关 2 星 / 教学看-帮-独真实链路 / 章 3 真实 PointerEvent 拖针（错拖+对拖通关）/ 章 4 真实点击通关 / 双 viewport 布局 / 截图非空白 / 运行时零 http 请求 / 全程 0 pageerror，共 39 项

## 验收钩子
`window.CLK = { get currentLevel{flat,ch,dch,lv,n,step,retries,done,won}, get quiz(){type,clockMin,items,answer[,endMin,dur|,targetMin]}, pick(i), setDial(mins), autoSolve(), get tutorial }`（quiz 返回拷贝非活引用）

## 已知限制
- 章 4 时长选项用纯分钟文案（"25分钟"），未做"1 小时 X 分"复合形态
- 拖拨按整个钟面为拖动区（未强制抓取针尖），高 <560px 视口钟面固定下限 200px 可能压缩留白
- 语音 clips 待管线合成（manifest 未含 clock 条目前静默无语音，TTS 兜底）
