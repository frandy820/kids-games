# batch12 反方审查报告（core-adversarial-reviewer，2026-09-07）

**总评：修后收（fatal 0 / major 1 / minor 10）**——数学与引擎正确性三款全部核过未发现计算错误；阻断项一条（fraction A 型题面违反 §0.23）。全部处置见文末。

## M1（major）fraction cut 题题面数词段走浏览器系统 TTS，违反 §0.23 硬门禁

- 证据：`fraction/_src/game-main.js:67` `queue(['fra_q_cut', { key: null, text: FRA_NUM[q.n] + '份' }])`；产物内嵌 core queue 实现对 key=null 段必走 SpeechSynthesisUtterance；`fra_q_cut2`（"份"）在库但全代码无引用；manifest 无 fra 数词 clip
- 影响：cut 题读题是正常游玩主路径（ch2 全部 25 题、ch1 一半、生成关半数），每次读题都在"晓晓 clip+系统 TTS"间音色跳变——正是 §0.23 定版（batch11 真机反馈）要消灭的病灶；根因=SPEC 语音清单漏列 fra 数词与 §2 拼接模式自相矛盾，实现用 ruling 自我正当化
- **处置（已修）**：补 fra_num_2/3/4 三条 clip 合成注入，queue 改 `['fra_q_cut','fra_num_'+n,'fra_q_cut2']` 全 clip；verify partsOk/openQ 断言同步全 clip 拼接、ruling 字段删除、_selftest ruling 断言删除；SPEC §2 与语音清单同步。实证 T1（flat5 读题 vlog=`Q:fra_q_cut,fra_num_3,fra_q_cut2` 无 NULL:/T: 段）✓

## minor 处置总表

| # | 问题 | 处置 |
|---|---|---|
| m1 | cmp 两选一 sayW `===2` 永不触发（miss 封顶 1） | **修**：cmp 改 `>=1`（错 1 即剩排除法，豁免恰一次）；实证 T2 miss=1+豁免播 1 ✓ |
| m2 | 分数卡 aria-label 读法颠倒（2/4 读作"2 分之 4"） | **修**：分母在前；实证 T3 ✓ |
| m3 | column tutorialWatch 缺 `_save()` null 防御（三款不一致） | **修**：`|| { levels: {} }`；实证 T4 空档教学零 TypeError ✓ |
| m4 | column 演出期黑板/空白点击无轻反馈 | **修**：stageEl 分支拆层 sfx('pop')；实证 T5 教学期黑板 pop ✓ |
| m5 | divide/fraction 答错 wrong 无 clip 走系统 TTS（契约内部矛盾，column 已复用 clm_hint） | **修**：div_wrong/fra_wrong 两条 clip 化+VOICE.wrong 换 key；SPEC §0.23 补"wrong 也一律 clip"；实证 T9 P:div_wrong 非 TTS ✓ |
| m6 | dayEnd `nextHint(lim)` lim%5==0 时章预告 off-by-one（batch5-12 全家族 20+ 处） | **修**：本批三款 4 处传 `lim-1`；实证 T6（lim=10 弹层=「明天：分不完的糖果，认识余数」=ch3 非跳 ch4）✓；历史款系列级记录在案 |
| m7 | 换题自动读题 flat 门口径不一（divide 有门、姊妹无门） | **修**：divide 去门统一 sayR 级；实证 T7 flat5 换题自动读题 ✓ |
| m8 | divide ch4 余数题黑板定格"7÷2=3"缺余数标注 | **修**：定格 `answer+'……'+rem`；实证 T8 formula='8 ÷ 3 = 2……2' ✓ |
| m9 | read 干扰含 n/n=1 与注释"禁假分数"矛盾 | **修注释措辞**：改"禁超过 1 的假分数（n/n=1 属合法近错放行）"（5 处）；SPEC §2 同步 |
| m10 | SPEC §1"N 颗（7-12）"与 ch1 含 N=6 矛盾 | **修 SPEC**：改"6-12" |

## 已核查通过项（审查者）

- divide 数学全链：三池 16 组合逐一验算、轮流发放恒等式（given 总和=N-rem=M×商）、停止条件对 rem=0/rem>0 均正确、干扰项池滤 0/负/等答案恒≥3
- fraction 数学：UN_TPL 微扰最坏比 1.571-1.605 全>1.5；read 干扰全值域枚举**无等值碰撞**（2/4 vs 1/2 不存在）；cmp 三对子方向正确
- column 数学：四 kind 生成域逐分支验算；auditQuiz 独立复算非同源；carry 小"1"不提前泄露；借位点常驻
- §0.3 生成关随机（batch11 M1 未复现）、确定性、batch8 语音链切断未复现、batch10 numCn(0) 未复现
- verify 同源性无 vacuous 断言、stub 六 API 齐、winFlow VERIFY 早退齐
- §0.20/21/7a 逐条核过；产物内嵌与 _src 一致；build 三重断言在位

## 未覆盖（审查者声明）

音频内容真值（发音正确性）、WCAG 对比度逐色计算、真实设备触控、column 教学全链 verify 覆盖（m3 修复后可直驱）、入口页逐项（复验 7/7 采信）。

## 复归验证（修复后，父会话）

- 实证 verify_review12_fixes.py **9/9**（T1-T9 对应 M1+m1~m8）
- 页面 verify：divide 48/48 / fraction 48/48 / column 51/51 全 PASS
- 全量复归：verify_one_fraction 16/16 + verify_one_div_clm 31/31 + verify_batch12.py **4/4** + verify_entry **7/7** + verify_voice 三款 23/20/8 clips
