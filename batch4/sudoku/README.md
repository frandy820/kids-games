# 数独小动物 sudoku（batch4 第三款）

单文件离线 HTML5 游戏，7-8 岁（一二年级）儿童向。图案数独：点空格选中，底部动物大按钮填入；再点已填格=清除。

## 玩法
- 4×4（2×2 宫，4 种动物，挖 5-7 洞）章 1-2 → 6×6（2×3 宫，6 种动物，挖 9-12 洞）章 3-4；生成关 flat≥20 两规格交替爬坡
- 冲突 = 该格+冲突源格红框轻晃 1s，可改零惩罚（填入保留，可清除重填）
- 填满且无冲突 = 过关；星级 = 提示 0 次 3 星 / 1-2 次 2 星 / 用满 3 次或冲突填入 ≥6 次 1 星（永不 0 星）
- 提示每关 3 次：高亮当前可唯一确定格 + 对应动物按钮 pulse（唯一候选优先，回退解值）
- 生成器（核心门禁）：写死完整解模板（4×4/6×6 各 2 个）→ 带内行互换/堆内列互换/动物编号置换（均保有效性）→ mulberry32(flat*7919+13) 按序变换 → 逐洞挖洞，每洞回溯求解器计数（cap=2）验证唯一解，不唯一即恢复
- 动物 SVG 与 batch2/memory 同风格（2.5px 暖棕描边），前 5 种同款 + 新增小猪；宫分组双通道视觉：宫底色深浅棋盘交替 + 宫边界加厚线
- 教学（仅 1-0 首次）：看 = 自动填 1 格含冲突演示（先错晃再放对）→ 帮 = 高亮可确定格+幽灵手指 → 独 = 首次正确填入后放手；存档字段 `sud.tutSeen`
- 20 秒无操作轻声提示；语音仅前 3 关（flat<3）

## 构建
```
cd batch4/sudoku && python build.py   # _src/head+body + core.js(全文原样) + clips + data+core+main → index.html
```
断言：core 含 settle()/queue(parts)；无字面 `</script>`；无 http(s)/外链。sudoku clips 未生成时降级空串，主会话注入语音后重建生效。

## 验收
- `index.html?verify=1` → 44 项全过（40 关静态 20+生成 20：确定性/唯一解计数==1/完整解约束/洞数区间/autoSolve 直驱 + 模板合法 + 宫边界单元 + 提示与星级单元 + 冲突清除单元），布局单列（4×4 格 110px/6×6 格 70px/动物按钮 104px/无横向溢出），title=`VERIFY PASS 44/44`，JSON 在 `#verify-result`
- `_selftest.py`（headless playwright，独立 chromium.launch()）：verify / 预置存档真实点击通关 .k-celebrate（3 星）/ 教学链路（看→帮→独）/ 冲突零惩罚路径 / 提示消耗 / 双 viewport 布局与触摸目标 / 截图非空白 / 0 JS 错误 / 零资源请求

## 验收钩子
`window.SUD = { currentLevel{flat,ch,lv,n,holes,hintsUsed,wrongs,won}, board{n,cells,given,sel}(getter 拷贝), solution(拷贝), fill(i,v), clear(i), hint(), autoSolve(), tutorial }`

## 已知限制
- 语音 clips 暂为空（manifest 无 sudoku 条目），运行时回退系统 TTS
- 生成关（flat≥20）规格循环爬坡，难度不再新升（洞数仍随种子变化）
- 冲突标记 1s 后消失但错误填入保留（按 SPEC"可改零惩罚"设计，非自动回退）
