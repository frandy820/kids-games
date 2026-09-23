# batch6 三款独立反方审查报告（words / compare / subbug）

> 来源：core-adversarial-reviewer（2026-09-07）。审查者环境只读无执行工具，全文为静态审查结论，由 orchestrator 代落盘。
> 修复记录见文末「修复处置」节（M2 定性经 orchestrator 复核修正：实际只打 words）。

## 审查结论

**fatal 0 / major 3（M1 仅 words；M2、M3 经复核合并） / minor 7。总体：修复后放行。**

无教错内容、无数据损坏、无离线违规、无崩溃路径；存在 1 处儿童可见的错误拼音显示、1 处章末预告错章（经复核仅 words 数据语义反）、1 处"过关演出窗口内点重玩=白拿 3 星"进度完整性竞态。

## major

### M1 words：荷 的拼音标签在题面直接显示 "he2"（内部 clip 后缀泄漏上屏）
- 证据：`words/_src/game-data.js`（`{ c: '荷', py: 'he2', ...}`，py 身兼 clip key 后缀与显示拼音两职）；`words/_src/game-main.js` renderQuiz 直接渲染 q.py。荷 在 flat 11 第 5 题正常游玩可达。
- 影响：识字/拼音教学产品向 6-7 岁儿童展示错误拼音"he2"（正确为 hé）。
- 修复：显示层剥离尾部数字（`q.py.replace(/\d+$/, '')`）。

### M2 章末预告 off-by-one（审查者初判"三款共有"，orchestrator 复核修正为"仅 words 数据语义反"）
- 公式 `ci=floor(flat/5); CHAPTERS[ci+1].hint`（flat4 章末 → CHAPTERS[1]）在**hint 文案按"预告下一章"写**的款（countchick/spotdiff/connect/compare/subbug——如 countchick 章 1 hint='小鸡变多啦，4 只 5 只数清楚'即章 2 内容）语义正确。
- **words 的四条 hint 原写成本章描述**（章 1 '两个字碰在一起'），章 1 末显示刚玩完的内容 ✗。
- 修复：words CHAPTERS hint 四条下移一位改写为"预告下一章"语义（章1='小心长得像的部件'=预告章2 辨析…章4='新一轮拼字挑战'=预告生成关）；GEN 文案验算全对不动。

### M3 三款共有：最后一题答对后的演出等待窗口内点"再玩一次"=该关未玩即写 3 星（进度完整性竞态）
- 答对末题先 `state.locked=true` 再 await 演出（words 1900ms / compare 1450ms / subbug 880ms）；replay 处理器无 locked/won 门 → `startLevel(cur.flat)` 重建全新 cur → 挂起续体在新 cur 上 winFlow → engStars(全新 cur)=3 星白拿并推进/触发日结。
- 修复：uiTap*/uiPick 类入口捕获 `const run = cur`，await 续体处 `if (cur !== run) return r`（身份守卫根治同类竞态）。

## minor（修 m2/m4/m5，其余记录在案）

1. words 章 4 未实现 SPEC 点名的跨章同部首家族同屏（实现以章内家族达成同机制）→ **SPEC 措辞已修订**（章内家族口径留痕）
2. compare 物品热区下限 56px 低于 64px 红线（双契约 viewport 实测 109/85 不触发，宽 <640px 设备会跌破）→ **已修**（56→64）
3. subbug 章 4 无"剩余=0"题与 SPEC 措辞分歧 → **SPEC 已收敛**为"章 3 必含、章 4 不含"
4. words 教学演示收尾语音叠播（renderQuiz 的 sayR 无 demo 门，截断演示字读音）→ **已修**（加 !state.demo 门）
5. compare VOICE.rec 复用 cmp_hint key 致 text 死文案 → **已修**（补 cmp_rec 专属 clip，manifest=343）
6. words 拼音无声调显示（míng 比 ming 规范）→ 记录，可选改进
7. subbug 20s 救援只播通用 hint 不重读含数字题面（hearBtn 的 qSpeech 信息量更优）→ 记录，可选改进

## 已核查通过项（审查者逐项独立核对）

- **words 48 字拆法逐字人工核验全部正确**（明/林/双/男/岩/尘/尖/灶/鲜/汗/村/看/他/地/妈/奶/江/河/好/晴/打/吃/沙/拍/森/晶/品/众/想/树/湖/唱/意/淡/落/荷/纸/苗/松/星/听/叶/洋/洗/草/花/谢/梦；parts 顺序=书写序；48 拼音含 he/he2 区分全对；组词全部常用）
- 干扰块歧义不存在（tile.t 先验分型，干扰块点击即 wrong 弹回不进槽）
- compare 引擎数学（answer 与 left.n/right.n 恒一致、num/count/mix 判定同源、'=' 分布 21%、关内 |gt-lt|≤1 平衡器）
- subbug answer=n-m 全链路（CANDS 离线枚举+逐关断言；飞满 m 后点剩余虫返 0 仅摆动；瓢虫独立数组完全隔离；答案 0 时干扰 {1,2} 不含 0）
- 教学 demo 通道无绕锁面（`(state.locked && !demo)` 豁免形态统一；demo 参数不暴露于钩子/事件）
- verify 与真实路径同源（UI 冒烟走钩子=同一 uiTap*/uiPick*；winFlow VERIFY 早退在位；stub 齐全）
- 写档/章号一致（keyOf=chOfFlat 三处同式；生成关 dch 循环 40 关全审计）
- 双指/多点触控（三款无状态点选，connect 双指孤儿形态结构不适用）
- transition 中途读几何（断言全在重建新元素上量测；subbug .animal 显式 transition:none）
- 离线与产物一致（仅 SVG xmlns 白名单 URL；core 契约行在位；48+1 条 clip 内嵌）
- 语音 flat 门分布（开场不受门/救援 sayR/常规 sayP——合规）
- 家长门（core 两位数加法+.k-panel，E2E 有真实覆盖）

## 残余风险（审查者声明）

纯静态审查（playwright 实证未做，由 orchestrator 修复方补齐——见下）；音频内容未复听；视觉渲染采信 agent 自测取证；<800px 宽设备非契约目标；flat≥40 生成关未逐关审计；batch6/index.html 门户页仅静态读。

---

## 修复处置（orchestrator，2026-09-07）

- M1：显示层 `q.py.replace(/\d+$/, '')`——实证荷题面显示 'he' ✓
- M2：仅 words 数据语义反——CHAPTERS hint 四条下移改写+注释留痕；compare/subbug 对照实证（compare 章1末='还有两边一样多'预告章2 =、subbug 章1末='更多小虫来啦'预告章2 数到十——本就正确）✓
- M3：三款 uiTap*/uiPick 入口 `const run = cur` + await 后 `if (cur !== run) return r`——实证三款末题演出窗内点重玩：flat 重开、won=False、levels 无新写入、0 pageerror ✓
- minor 修 3（m2 热区 64/m4 demo 门/m5 cmp_rec clip）+ SPEC 措辞修订 2（m1/m3）；m6/m7 记录在案
- 复验：verify_review_fix.py **8/8 PASS** + verify_batch6.py 复归 **5/5 PASS**（三款 rebuild：words 1116354 / compare 268602 / subbug 247586 B）
