# 七巧板拼图 tangram

拖动板块放到上方虚线槽位；无位移短按=旋转 45°。就近吸附（质心距<0.6 单位+旋转外观等价，计入形状对称周期），
全部就位=过关（星级按多余操作数：≤2→3星 / ≤5→2星 / 其余 1 星，永不 0 星）。

- 目录：`index.html` 成品（单文件离线）；`_src/` 源码；`build.py` 拼接（core.js 原样内嵌+clips 注入）；
  `_tools/` 模板设计校验（design.py）与 7 块形整数网格搜索（solve7.py）
- 数据层 `_src/game-data.js`：SHAPES/ROT_PERIOD/11 模板（design.py 校验 OK 的 9 个 + solve7.py 搜索产出的
  T7S 正方形/T7B 火箭形，T7A 搜索解视觉不连通已弃用）/STATIC_LEVELS 4 章 20 关/无限生成轮转
- 引擎 `_src/game-core.js`：纯函数（vertsOf/overlapArea SH 裁剪/snapCheck/engRotate/engDrag/engDrop/engStars）
- 关卡确定性：mulberry32(flat*7919+13)——同 flat 永远同关
- 语音：仅前 3 关（sayP，flat<3）；文案 tan_tut_watch/tan_tut_turn/tan_hint（clips 已注入）
- 教学：关 1-0 看-帮-独（save.tan.tutSeen）；闲置 25s 高亮未就位块目标虚线（提示不代做）
- `?verify=1`：25 关结构校验（确定性/块集合=模板/无重叠）+ 吸附正负例各 6 + autoSolve 直驱 + 布局抽查
- 验收钩子：`window.TAN = { currentLevel, pieces(), rotate(i), place(i,x,y), autoSolve(exec) }`
