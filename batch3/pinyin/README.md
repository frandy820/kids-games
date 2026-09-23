# 拼音小火车（batch3）

6-7 岁幼小衔接拼音启蒙。小兔子开小火车：答对一题挂一节车厢，通关小火车开走。
单文件离线 `index.html`（build.py 拼接产物），双击即玩，无任何外部请求。

## 玩法（4 章 x5 关 + 无限生成关）

- 章 1 认声母：23 声母，形近干扰 b/d/p/q、m/n、平翘舌
- 章 2 认韵母：单韵母→复韵母，a/o、iu/ui、ie/ei、前后鼻音
- 章 3 两拼：车头声母 + 货物（汉字/小图），选韵母车厢（如 d + 读 → u）
- 章 4 复韵母两拼 + 整体认读 16 交替
- 星级：全对 3 星 / 总重试≤2 = 2 星 / 否则 1 星（永不 0 星，零惩罚可重点）
- 教学（仅 1-0 首次）：看（幽灵手指演示）→ 帮（高亮+5s 重演示）→ 独（答对即放手）
- 语音仅前 3 关；音节库 124 两拼 + 16 整体认读 + 14 零声母，详见 voice-manifest.md

## 构建

```
python _src/build.py   # head+body+core.js+data+engine+main → index.html
```

- core.js 原样内嵌（design/core.js 最新契约版），clips 经 voice/inject_clips.py 注入（未就绪时空串降级）
- 确定性生成：mulberry32(flat*7919+13)，同关号永远同关卡

## 验收接口

- `index.html?verify=1`：title=VERIFY PASS n/n，JSON 结果在 #verify-result
- `window.PYI`：currentLevel / quiz / pick(i) / autoSolve() / tutorial
- 自测：`python _selftest.py`（无头独立 Chromium，24 项：verify/真实点击通关/教学链路/双 viewport/截图非空白）

## 测试结果（2026-09-05）

- VERIFY PASS 29/29（音节库 3 单元 + 静态 20 关 + 生成 5 关 + autoSolve + 布局）
- _selftest 24/24；双 viewport overflowX=0、车厢 140px、重听 88px、无重叠

## 已知限制

- 语音 clips 未注入（管线待主会话补，重建即可；现回退 TTS 读代表字）
- SPEC 中 huā/niǎo 为三拼音节，与「两拼仅用合法组合」冲突，未收录
- eng/ong 无独立本音，只作视觉干扰项，不出听音题
- 124 音节中 20 个带内嵌小图，其余显示代表汉字大字
