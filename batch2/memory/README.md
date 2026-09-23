# 记忆翻牌配对 memory（batch2 r19 难度改造版）

单文件离线 HTML5 游戏，6-7 岁目标难度（r19 审计改造：原 4 岁级偏易）。
翻两张牌配对收走，全配对过关。真值源：`../SPEC-R19-MEMORY.md`。

## 玩法（r19）
- 同图关（same）：同图案配对；补数关（sum10）：两面数字和为 10 配对（3 配 7、6 配 4，凑十前奏）
- 图案相似化干扰：8 近形族（cat/cat2 圆耳变体等 19 图案），同族不同面的"双胞胎"对防轮廓匹配捷径
- 先看后翻（peek）：ch3 起全牌亮出（800+对数×750ms）后盖回，凭短时记忆找对（翻回后再找）
- 失误盖回停 900ms；星级：失误 ≤ 对数×1.5 → 3 星；≤ ×2.5 → 2 星；否则 1 星（永不 0 星）
- 关表：静态 24 关（4 章×6）+ flat≥24 无限生成（种子 1056：四难度档+双模式均匀）
- 教学：仅关 1-0 首次（看→帮→独），存档 `mem.tutSeen`；支架 3 连失误幽灵手指；救援双锚 14s 方向级/30s 答案级
- 错反馈链：连续失误每 +3 播链句（flat<3 必播；≥3 十秒节流），链句播放期救援/支架语音让路

## 构建
```
python _src/build.py   # head+core+clips+data+engine+main+verify → index.html（幂等）
```
静态断言：家族契约 A/B/D/E/F/I/J/K/N/MIG/SEED + estMs 四方 + PORT-CLS 竖屏逐行全等 + r19 数学锚 + 完全离线。
clips 注入失败 `sys.exit(3)` 禁静默降级。旧结构备份在 `build_legacy/`（不参与构建，防误跑）。

## 验收
- `index.html?verify=1` → title=`VERIFY PASS 16/16`（patterns/levels40/engine/stars/sum10domain/twins/peek/tutorial/autoSolve/swallow/layout/clips/contract/estWin/modeled/hints），JSON 在 `#verify-result`
- `python _selftest.py` → 66 项行为级（真实点击链/教学链/peek/补数/迁移三例/S1 语音三态/S2 救援双锚/双视口/0 发声）
- `python _src/_spec_calc.py` → python 位级复算 40 关表对账
- 测试音频纪律：INIT_SND 工厂+STUB stub+种档 sound/tts false 三层静音

## 验收钩子
`window.MEM = { start(flat), currentLevel{flat,ch,lv,grid,pairs,mode,peek,twins}, cards()[{id,pairId,face,state}], flip(i), miss(), autoSolve(exec), tutorial, state{peek,locked,streak,misses,wrongChainUntil,ghost} }`

## 已知限制
- 卡尺寸 clamp [96,168]：极小视口（宽 <340px）下 4×5 网格可能溢出（未在此范围测试）
- 语音 10 键（mem 7+core 3）已全量合成注入（4 新键实测 2688/3240/3384/3144ms，verify SPEC_DUR ±60ms 对账）；错链窗 3660/4695 按 estMs 口径保持（4 新键实长均短于实算值，不收窄）
