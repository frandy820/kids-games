# 乘法捕鱼 times 语音清单（待合成，主会话语音管线用）

游戏内语音仅前 3 关播放（flat<3）；core 章/日/休息语音走 core_* 键不受此限。
整句 clip 4 条 + 题面读音单元 clip 14 条：题面/转化卡读音走 `voice.queue` 按单元拼接（数字 2-81、十、加、乘、等于、几），任一单元 clip 缺失时该句自动降级整句 TTS 兜底文案。
合成后按此清单把条目并入 `voice/clips/manifest.json` 并重跑 `python build.py` 注入 clips。

## 整句 clip

| key | text | 使用场景 |
| --- | --- | --- |
| tim_tut_watch | 看！数一数有几条鱼 | 教学第一步（关 1-0 首次，分组图演示） |
| tim_tut_turn | 你来算一算 | 教学第二步（演示完交还给孩子） |
| tim_hint | 数一数，再选答案 | 每关开场 / 答错提示 / 20s 无操作提示（仅前 3 关） |
| tim_also | 也可以说 | 连加→乘法转化卡读音前缀（"也可以说，三 乘 三"） |

## 题面读音单元 clip

| key | text | 说明 |
| --- | --- | --- |
| tim_times | 乘 | 乘号 |
| tim_plus | 加 | 连加加号 |
| tim_eq | 等于 | 等号 |
| tim_howmuch | 几 | ? 的读音（"等于几" / 缺因数句首"几 乘…"） |
| tim_shi | 十 | 中文数字十位（11-99 拆读） |
| tim_n1 | 一 | 数字 1（个位，如 21=二十一） |
| tim_n2 | 二 | 数字 2 |
| tim_n3 | 三 | 数字 3 |
| tim_n4 | 四 | 数字 4 |
| tim_n5 | 五 | 数字 5 |
| tim_n6 | 六 | 数字 6 |
| tim_n7 | 七 | 数字 7 |
| tim_n8 | 八 | 数字 8 |
| tim_n9 | 九 | 数字 9 |

注：数字拆读规则——2-9 直读；10-19=十+个位；20-99=十位+十[+个位]（题面最大 9×9=81，无 0 结尾读音，故不需要 tim_n0）。

manifest.json 追加块（直接抄）：

```json
 "tim_tut_watch": { "text": "看！数一数有几条鱼", "games": ["times"] },
 "tim_tut_turn":  { "text": "你来算一算",         "games": ["times"] },
 "tim_hint":      { "text": "数一数，再选答案",    "games": ["times"] },
 "tim_also":      { "text": "也可以说",           "games": ["times"] },
 "tim_times":     { "text": "乘",                 "games": ["times"] },
 "tim_plus":      { "text": "加",                 "games": ["times"] },
 "tim_eq":        { "text": "等于",               "games": ["times"] },
 "tim_howmuch":   { "text": "几",                 "games": ["times"] },
 "tim_shi":       { "text": "十",                 "games": ["times"] },
 "tim_n1":        { "text": "一",                 "games": ["times"] },
 "tim_n2":        { "text": "二",                 "games": ["times"] },
 "tim_n3":        { "text": "三",                 "games": ["times"] },
 "tim_n4":        { "text": "四",                 "games": ["times"] },
 "tim_n5":        { "text": "五",                 "games": ["times"] },
 "tim_n6":        { "text": "六",                 "games": ["times"] },
 "tim_n7":        { "text": "七",                 "games": ["times"] },
 "tim_n8":        { "text": "八",                 "games": ["times"] },
 "tim_n9":        { "text": "九",                 "games": ["times"] }
```
