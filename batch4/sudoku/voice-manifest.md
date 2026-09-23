# sudoku 语音清单（voice-manifest）

游戏内语音仅前 3 关播放（flat<3，sayP 包装）；core 低频语音（章末/日末/休息）不受限。
合成参数照 batch1/2/3 管线：edge 晓晓 zh-CN-XiaoxiaoNeural -8%/+18Hz，key 即文件名（voice/clips/）。

## 游戏语音（3 条，待主会话合成注入）

| key | text | 场景 |
|---|---|---|
| `sud_tut_watch` | 看！每行每列都要不一样 | 教学"看"演示开场（仅关 1-0 首次，含冲突演示） |
| `sud_tut_turn` | 你来填一填 | 教学"帮"交接（演示完重发同一关） |
| `sud_hint` | 每行每列都不能重复哦 | 开场提示 / 冲突填入时 / 点小兔子 / 提示按钮 / 20 秒无操作提示 |

## core 复用语音（3 条，已存在于 manifest，games 数组需加 `sudoku`）

| key | text |
|---|---|
| `core_chapter_end` | 这一章完成啦，明天还有新关卡哦 |
| `core_day_end` | 今天的新关卡玩完啦，明天见 |
| `core_rest` | 我的眼睛要休息啦，我们去看看远处的大树吧，明天再一起玩 |

## manifest 增量（games 字段）

```
sud_tut_watch / sud_tut_turn / sud_hint      → games: ["sudoku"]
core_chapter_end / core_day_end / core_rest  → games 追加 "sudoku"
```

注：本游戏无动物名称语音（零文字依赖，动物不做命名播报），故游戏侧仅 3 条。
