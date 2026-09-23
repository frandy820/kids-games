# 算术小勇士 math 语音清单（待合成，主会话语音管线用）

游戏内语音仅前 3 关播放（flat<3，用户反馈"太频繁"后定的范围）；core 章/日/休息语音走 core_* 键不受此限。
TTS 兜底文案与 `_src/game-data.js` 的 `VOICE` 一致；合成后按此清单把条目并入 `voice/clips/manifest.json` 并重跑 `python build.py` 注入 clips。

| key | text | 使用场景 | games |
| --- | --- | --- | --- |
| mat_tut_watch | 看！算一算，点出答案 | 教学第一步（关 1-0 首次，数轴演示） | math |
| mat_tut_turn | 你来算一算 | 教学第二步（演示完交还给孩子） | math |
| mat_hint | 数一数，再选答案 | 每关开场 / 答错提示 / 20s 无操作提示（仅前 3 关） | math |

manifest.json 追加块（直接抄）：

```json
 "mat_tut_watch": { "text": "看！算一算，点出答案", "games": ["math"] },
 "mat_tut_turn":  { "text": "你来算一算",          "games": ["math"] },
 "mat_hint":      { "text": "数一数，再选答案",     "games": ["math"] }
```
