# shop-math 数字小卖部（batch1）

单文件离线儿童游戏（5-6 岁第一档）。core.js v1.0（含 session.settle 的 12:36 版）
全文原样内嵌——由 build/build.py 从 design/core.js 读取拼接，未手抄；改动游戏请改 build/ 源件后重跑 build.py。

> **r6 难度改造（2026-09-13，本文件「SPEC r6」块为真值源）**：原「1-5 点数买一件」审计红款
> （计数域对 6 岁半低约 2 岁、时长全靠演出）已升级为「多件合成+预算约束的组合决策」：
> 计数域 6-20（≥10 按群：两个两个/五个五个）、两三件合成总价点硬币付整、预算选购+付整找零。
> 玩法段落（下文）描述的是 r5 前旧形态，参数以 SPEC r6 块为准。

## 玩法
小动物顾客（8 种内联 SVG：猫/狗/兔/熊/象/蛙/熊猫/猪）门口排队进场 → 头顶气泡=商品图标×数量+数字+点数
圆点+TTS「我要三个苹果」→ 点货架（苹果/香蕉/梨/橙子，颜色形状差异大）放篮、点篮中商品放回 →
点大结账按钮（右下 ≥96px 拇指区）。正确=硬币动画+顾客开心表情+离开+进度果+1+勾图标（绿+图形双编码）；
错误=气泡重闪+TTS 重报需求+歪头兔提示卡（灰蓝 #8A9BAE+循环箭头，无大红叉），篮子保留可继续调整。
4 章×5 位客人=20 关；每位客人=1 关；每日 3 关（KIDS.calendar）；章末打烊卷帘+chapterEnd；今日新关
完成→dayEnd；休息提示/家长面板/存档全走 core。教学关 1-0=「看-帮-独」：自动演示完整一单（仅首次，
约 5 秒）→ 幽灵手指示范点 1 次货架 → 孩子完成后放手（每步 5 秒无操作补示范一次）。
防挫败：无倒计时；同一单错 3 次自动支架（高亮正确货架+演示放入一个）；兔子按钮随时可看演示。

## 验收钩子
- window.SHOP = { currentOrder, addItem(k), checkout(), state }
- 货架商品格 .shelf-cell[data-item=apple|banana|pear|orange]
- 结账按钮 #btn-checkout；状态机 enter→asking→shopping→(checkout)→paying→leaving / hint

## verify 接口（?verify=1）
同步遍历全部 20 单×双路径：正确装篮→结账→断言 leaving；装错数量→结账→断言 hint 且篮子保留、
仅错误计数（星级仍≥1，无惩罚）。附布局自检：overflowX=0、货架格/结账≥96px、结账在下半屏。
结果 JSON 写 #verify-result；document.title='VERIFY PASS n/n' 或 'VERIFY FAIL'。
verify 模式不启动正常循环、不初始化 KIDS、不播声音。

## 自测结果（2026-09-05，本机 Chrome headless + node）
- 语法：提取两个 <script> 块 node --check 全过
- ?verify=1：VERIFY PASS 20/20；800×1180 与 1280×800 均 layoutOk=true（overflowX=0，
  货架格 124×134，结账 128×128 且下半屏）
- 截图 shots/：play-800x1180.png、play-1280x800.png、verify-800x1180.png；像素方差 846-1474
  非空白；目检（VLM）确认气泡=苹果图标+数字1 在顾客头顶、货架 4 格无遮挡、底栏正常
- 过程修复：① 教学"看"演示被自身输入锁拦截致演示结账误入错误分支 → addItem 放行 demo +
  demo 结账确定性；② #bubble 缺 top/bottom 锚定漂移 → 锚定顾客头顶（--cw 变量）

## 2026-09-05 反方审查修复
- fatal：章号写档 0 基/读档 1 基不一致（首次章末结算崩溃）——已统一 1 基并防御式读取，章末通关 E2E 回归通过。
- core：存档损坏容错、休息提示按日清零、家长门升两位数加法；货架/篮内间距 ≥16px；支架区分"已齐/超量"话术。

## 已知限制
- TTS 兜底依赖系统 speechSynthesis（clip 缺失时才走）；订单/反馈主链路已全 clip 化离线可用
- 截图用 --virtual-time-budget 快进，动画相位与真机略有差异（非缺陷）

## SPEC r6（2026-09-13 难度改造定案；本块=参数真值源，game-verify.js 独立重列对账）

**改造 delta（全部落地）**
1. 计数域 1-5 → 6-20 按章升档：ch1 单件 6-10、ch4/生成域 6-14；目标 ≥10 出按群策略条
   （1/2/5 计数档位）+ 气泡分组点亮 + 组末报数（teach r5 先例：分组点亮+组末报数）
2. 多件合成总价：买 2-3 件算总价，点硬币 [1,2,5] 付整（点数合成，非抽象竖式）
3. 预算约束选购：「我有 B 元买两/三样」→ 选品（Σprice≤B，可重复同款）→ 付 B 找零
   （B−Σ 用硬币操作承载）；同预算多解 ≥2
4. 干扰与公平：候选含买不起组合（总价>预算，恒由构造保证）与非所要商品；错误反馈为
   方向锚不泄答案（「钱不够哦，换一样试试」/「这个不是它想要的哦」/「他还想买两样哦」）
5. 每关 2 轮独立订单（教学关 1-0 除外，单轮豁免时长断言）以满足单关净时长 ≥40s

**SPEC-P 价格表（封闭）**：apple 2 / banana 3 / pear 5 / orange 7 元；硬币面额 [1,2,5]
**预算封闭集 (want,B)**：{(2,8),(2,10),(3,12),(3,14)}——独立枚举证：每组可行组合 ≥2、
超支组合 ≥1（如 (2,8)：恰 2 件 Σ≤8 可行 2+2/2+3/2+5/3+3/3+5=5 组，超支 2+7/3+7/5+5/5+7/7+7=5 组——r6 审查 m-1 勘误：原「4 组」漏 3+5）
**章节封闭表（20 关 ×2 轮，生成关 i≥20 走 mulberry32(i*7919+13) 确定性混排，域同静态）**
- ch1（1-0..1-4）count 单件：教学 apple×1；6/7、8/10、9/10、10/6（含三个 n=10 按群轮）
- ch2（2-0..2-4）sum（r6 审查 m-1 勘误：关1 轮2 实为 p+o=12，原「b+p=8」错位）：a+b=5/p+o=12、b+p=8/a+b+o=12、a+o=9/b+o=10、a+b+p=10/a+p=7、a+p+o=14/b+p+o=15
- ch3（3-0..3-4）budget：(2,8)(2,10)、(3,12)(2,8)、(3,14)(3,12)、(2,10)(3,14)、(2,8)(3,12)
- ch4（4-0..4-4）混出：count 11-14 按群 + sum + budget 混排
- 轮型：C(k,n) count（n≥10 grouped）/ S(ks) sum（total=Σprice 5-15）/ B(w,B) budget

**时序分账（5.5 岁实测人设，每步 2-5s 下限）**：TAP=2000/SEL=2500/COIN=3500/COMPUTE=3000/
LISTEN_PAD=2000/CHG_PAD=1000/CONFIRM=2500/ENTER=3000/ROUND_T=3000/GAP=150/CHANGE_COINS=1；
**净时长下限 MIN_MS=40000**（每关实测模型 41-62s 全过线）；**互动占比 share=(A+B)/T ≥0.55**
——A=听题理解（订单 clip 实测时长）+B=点数/选品/硬币操作；T=全关；演出 C=进场+轮过渡仅占
~0.2-0.27（占比 0.73-0.82 实测）。estMs 家族定版 `s.length*345+600`（b25 SAPI 口径，禁 +300
变体，build.py 字面断言），仅用于组末报数等 keyless TTS 窗。

**语音 r6**：新增 96 clip key（shop_g_{good}_{6..20}×60、shop_name_*×4、shop_n_{6..20}×15、
固定句 17），既有 clip 文本零改动（1-5 段逐字相等已程序校验）；合成走既有 edge-tts 流水线
（gen_clips.py，幂等 ok=96 skip=1620 fail=0）。**SPEC_DUR 真值表=build/game-verify.js 内嵌
98 键浏览器实长**（new Audio onloadedmetadata 实测，±60ms 断言）；代表值 ms：
shop_want 1344 / shop_ask_total 3432 / shop_group_hint 4968 / shop_cheap 2928 / shop_notwant 2352 /
shop_buy2 1824 / shop_chg_q2 2904 / shop_pay_less 2904；shop_g_* 族 1440-2064、shop_n_* 族
1344-1680。manifest 对账：shop 游戏键 128 = 原 32 + 新 96（R6_KEYS 98 键全量在场）。

**r6 补建设施**：build/game-verify.js（?verify=1 自检 12 单元：30 关审计/预算构造独立枚举/
状态机×3/按群/硬币引擎/语音链独立对账/SPEC_DUR±60ms/estMs 家族/时序分账/双 viewport×3 态
布局 bbox）+ build/selftest.py（真实点击 2a-2d+双 viewport+离线+0 pageerror）+ body.verify
过渡禁用（bbox 量测确定性）+ window.SHOP 兼容面扩至 {basket,errors,paidSum,addCoin,...}。

**r6 验证记录（2026-09-13，全绿）**
- build.py 重建 OK（2,119,378 chars，完全离线）；node --check 全源过
- ?verify=1：VERIFY PASS 12/12（两次复跑双绿）；SPEC_DUR 98/98 实测±60ms
- selftest.py 40/40（2a 计数双轮+notwant 锚、2b 合成+空付 less+5+5+2、3-0 cheap 锚+找零 1 元+
  整付 0 找零、2d 按群 5 组击+组末报数 say、双 viewport overflowX=0+按钮≥63、0 http 请求 0 pageerror）
- 姊妹回归 batch1/verify_batch1.py 29/29（pipe-rabbit+shop-math+kitchen-rhythm；
  shop 段按 r6 轮结构更新驱动：逐轮填货结账至存档增长/章末层出现——断言从本 SPEC 推导）
