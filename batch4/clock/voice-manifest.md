# 时间小管家 clock 语音清单（待合成，主会话语音管线用）

游戏内语音仅前 3 关播放（flat<3，sayP 包装）；core 章/日/休息语音走 core_* 键不受此限。
TTS 兜底文案与 `_src/game-data.js` 的 `VOICE` 一致；合成后按此清单把条目并入 `voice/clips/manifest.json` 并重跑 `python build.py` 注入 clips。

| key | text | 使用场景 | games |
| --- | --- | --- | --- |
| clk_tut_watch | 看！读一读钟面上的时间 | 教学第一步（关 1-0 首次；章 3 首进拨针演示同用此条） | clock |
| clk_tut_turn | 你来点一点 | 教学第二步（演示完交还给孩子） | clock |
| clk_hint | 看看长针指在哪里 | 每关开场 / 答错提示 / 20s 无操作提示 / 读题按钮（仅前 3 关） | clock |

manifest.json 追加块（直接抄）：

```json
 "clk_tut_watch": { "text": "看！读一读钟面上的时间", "games": ["clock"] },
 "clk_tut_turn":  { "text": "你来点一点",            "games": ["clock"] },
 "clk_hint":      { "text": "看看长针指在哪里",       "games": ["clock"] }
```
