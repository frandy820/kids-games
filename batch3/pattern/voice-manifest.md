# pattern 语音清单（voice-manifest）

游戏内语音仅前 3 关播放（flat<3，sayP 包装）；core 低频语音（章末/日末/休息）不受限。
合成参数照 batch1/2 管线：edge 晓晓 zh-CN-XiaoxiaoNeural -8%/+18Hz，key 即文件名（voice/clips/）。

## 游戏语音（3 条，待主会话合成注入）

| key | text | 场景 |
|---|---|---|
| `pat_tut_watch` | 看！找一找图案的秘密 | 教学"看"演示开场（仅关 1-0 首次） |
| `pat_tut_turn` | 你来接着摆 | 教学"帮"交接（演示完重发同一关） |
| `pat_hint` | 看看前面的图案 | 开场提示 / 点小兔子 / 20 秒无操作提示 |

## core 复用语音（3 条，已存在于 manifest，games 数组需加 `pattern`）

| key | text |
|---|---|
| `core_chapter_end` | 这一章完成啦，明天还有新关卡哦 |
| `core_day_end` | 今天的新关卡玩完啦，明天见 |
| `core_rest` | 我的眼睛要休息啦，我们去看看远处的大树吧，明天再一起玩 |

## manifest 增量（games 字段）

```
pat_tut_watch / pat_tut_turn / pat_hint        → games: ["pattern"]
core_chapter_end / core_day_end / core_rest    → games 追加 "pattern"
```

注：本游戏无图案名称语音（零文字依赖，图案不做命名播报），故游戏侧仅 3 条。
