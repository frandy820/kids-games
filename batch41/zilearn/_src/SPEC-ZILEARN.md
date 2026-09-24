# SPEC-ZILEARN 识字小课堂（batch41，第 151 款，5-8 岁主线认字）

> 六件套：`_src/game-data.js`（数据）+ `game-core.js`（纯引擎）+ `game-main.js`（主逻辑）+
> `game-verify.js`（?verify=1 自检）+ `game-head.html`（布局）+ `build.py`（拼接+对账门禁）；
> 产物 `../index.html`（4 script 块：core/clips/游戏/verify）。字表真值源 `_src/chars.json`
> （150 字定稿快照，自 F:/claudecode/output/kids-games-zilearn/chars.json）。

## §0 全局常量与确定性

- `CH_LEN = 5`（5 题位=1 关）、`STATIC_LEVELS = 20`（4 章×5 关）、生成关 flat≥20 无限。
- 关卡种子 `mulberry32(flat * 7919 + 97)`（本款常量 **97**）：同 flat 永远同关。
- 消耗序（genLevel 内 rnd 单流，SPEC 副本与引擎必须一致，verify ② 深对账）：
  静态：`shuffled(newChars)` → listen3×charOpts → word 题 charOpts → match wordOpts →
  quiz 位1 `floor(rnd()*5)` 抽本关字 → quiz 位2 复习字（确定性取 `review[flat % len]`，
  空 review 错位取 order）→ quiz 两步 sub 各掷 `rnd()<0.5`（listen|word）+charOpts。
  生成：`weightedTargets(7)` → listen3 → word charOpts → match wordOpts → quiz 两 sub 掷+charOpts。
- 星级（家族口径，永不 0 星）：miss 0=3★ / 1-2=2★ / ≥3=1★。判定点 7/关。
- autoSolve taps=判对次数=7/关（watch 演出 0 判定不计）。

## §1 题位谱（每关 5 位，判定 3+1+1+2=7）

| 位 | kind | 判定 | 内容 |
| --- | --- | --- | --- |
| qi0 | watch | 0（演出锁防误触） | 静态=本关 5 新字逐一亮相；生成=2 新引入字（池尽 flat≥45 亮相加权池 2 字）。pic 字（26，渲染端 picSvg() 补 svg 包裹 r1-M1）：ev 古形→svg 甲骨形→大字三段（`#watch.p2` 切换）；非 pic 有 glyph：字理文案+大字；无 glyph（124 字 glyph=null）：plainmode 纯大字段（r1-M4）。每字窗 pic=WATCH_P1+P2=2200、非 pic=LOOK_MS=2800（r1-m3 勘正：flat0 五 pic 字总窗 ~12.8s 非 ~14.2s，SPEED 缩放），逐字播 `zi_ch_<py>` |
| qi1 | listen | 3（half×2→right） | 静态=本关 5 字洗牌取前 3 各 1 轮；生成=加权池取 3。每轮播 `zi_listen`+`zi_ch_<py>` → 4 字卡选 1。每 half 解锁处刷 lastAct（r25 M2 铁律） |
| qi2 | word / sentence | 1 | flat<10 与生成关=词挖空（目标首词目标字→＿，`＿空`式）；10≤flat<20=本关句子挖 1 字（挖空目标=charsUsed 中非白名单且在 CHARS 的字里引入 flat 最新者——子集铁律：句子只用关前已学字） |
| qi3 | match | 1 | 目标字大卡→4 词选 1：正确=目标首词；干扰=其他字首词（静态=本关其余新字、生成=本关 7 目标其余+池序），禁含目标字、互异 |
| qi4 | quiz | 2（half→right） | 静态=本关 1 字（rnd 抽）+reviewSchedule 复习字 1（`review[flat%len]`，空 review 关错位取本关字=纯复习位兜底）；生成=加权池第 6/7 目标。每步 sub 掷 coin：listen|word。播 `zi_quiz`+`zi_word` |

**选项构造**（全字卡题统一）：目标 + `CHARS[t].distract` 字符（去重）+ `padOrder` 补足 3 干扰：
①本关新字→②本关复习字→③本关句子实字（非白名单）→④静态首见序→⑤GEN_POOL 序；洗牌后 `ans=indexOf(目标)`。
match 题选项=词（ans 处=目标首词）。

**生成关加权律**：池=静态 100+GEN_POOL 已引入（含本关新 2 字）；recent3（本关与前 2 关引入字）
权重 ×3、其余 ×1（确定性权重表=规范序重复展开），洗牌取 7 个互异目标按谱分配。

## §2 防泄露（悟空槽点对策）

- 题面区 `#stage` 与选项区 `#opts` 物理分离（独立容器；verify/P3 断言选项上沿>题面下沿）。
- 视觉题（word/sentence/match）题面期**绝不播** `zi_ch_<目标>`（听音题的题面音=目标字音本身是玩法）；
  verify ④ 以语音键账断言；答对后的确认链尾段 chKey=强化音（允许，在判定后）。
- miss≥2 不 breathe/pulse 正确项（无答案暗示动画）；breathe 仅 30s 答案级救援。

## §3 语音键账（r41 两段制；段一接线不注册，段二 gen_clips 中央登记）

共 **178 键** = zi_ch_ 150 + zi_st_ 20 + 通用 8：

| 族 | key | 文案（TTS text） | 备注 |
| --- | --- | --- | --- |
| 每字读音组词 | `zi_ch_<py>` ×150 | `<字>，<首词>的<字>`（wrd 范式） | py=无调拼音+同音序号（首见无后缀，ü 作 v），全表唯一 ASCII；`chText()` 同式 |
| 句子朗读 | `zi_st_0`..`zi_st_19` | 对应 `SENTENCES[i].text` 原文 | 答对确认链尾段（sentence 题位） |
| 教学看 | `zi_tut_watch` | 看！来认识新字啦 | |
| 教学操作 | `zi_tut_turn` | 你来点一点 | |
| 提示 | `zi_hint` | 想一想，再选一选 | |
| 答对 | `zi_right` | 答对啦，真棒 | 确认链首段 |
| 答错 | `zi_wrong` | 不对哦，再想一想 | flat<3 每错必播，flat≥3 10s 节流（契约 J） |
| 听音题面 | `zi_listen` | 听一听，找一找 | |
| 选字题面 | `zi_word` | 选一选 | |
| 小测题面 | `zi_quiz` | 小测时间到 | |

**段一行为**：zi_ 全部未注册 → `KIDS.voice.play(key,text)` 缺 clip → core v1.0 `speak` 为静音
no-op（Task#46 阶段3 已删 speechSynthesis 通道）= 游戏静音可玩不崩；_selftest 全程 MUTE 双保险。
**段二动作（主线）**：gen_clips.py 中央登记 178 键（games:['zilearn']，core_* 3 键 games 数组同步
加 'zilearn'）→ 合成晓晓真人声 → 实长回填（见 §R9）→ `python _src/build.py` 重建自动带上 clips
（build 断言从段一 0 键收紧为段二 178 键全在册，禁部分注册）。

**gen_clips 提取口径（给段二的精确清单；已用 `_r_zi_regex_probe.py` 对 game-data.js 实测
178/178 全唯一）**：
- `zi_ch_*` 150 条（CHARS 表，键=汉字字面）：
  `re.findall(r'"([^"]+)": \{ py: "([a-z0-9]+)", pyFull: "[^"]*", chNo: \d+, words: \[\["([^"]+)", "[^"]*"\]', src)`
  → key=`zi_ch_<py>`，text=`<字>，<首词>的<字>`（与 `chText()` 严格一致，零手抄）；
  断言提取数==150、py 唯一。
- `zi_st_0..19` 20 条（**SENTENCES 表段内**正则——避开 LEVELS 里 sentence 的双写）：
  先 `seg = src[src.index('const SENTENCES'):src.index('const REVIEW_SCHED')]`，再
  `re.findall(r'\{"text": "([^"]+)", "afterFlat": (\d+)', seg)` → key=`zi_st_<afterFlat>`，text=原句。
- 通用 8 条：VOICE 表字面（上表），key/text 一字不改。
- 提取源锁定 `_src/game-data.js`（非 output 的 chars.json——工程真值源在 _src，build 每次对账）。

## §R5 日历限速（本款特殊处理，SPEC 声明）

识字节奏保护（调研：洪恩一天一课 5-6 字）：**首日 2 关（10 新字）→ 次日 3 关 → 第 3 日 4 关 →
第 4 日起 6 关/日**。实现=`ZI_DAY_NEW=[2,3,4]`+`ziBase(day)`（累计基数 2/5/9/15/21/27/33/39...）；
`ziLimit(total)=min(total, ziBase(dayIndex)+bonusToday())`。
**不走 core `calendar.limit`**（其首日 6 关=30 字/日对识字主线过快）；家族 bonus 机制原样复用
（家长面板「今日多玩关数」core `calendar.bonusSet`，在 ziBase 上追加）。verify ⑩ SPEC_ZI_BASE
独立表对账。

## §R9 时序参数（段一 estMs 估值口径；段二 2026-09-24 实长回填已完成）

**段二实长实测（headless Audio duration，178 键全测）**：通用=wrong 2496/right 2280/tut_watch 3048/
tut_turn 1824/hint 2640/listen 2376/word 1632/quiz 1992；zi_ch 150 键 2016-2424（max 2424）；
zi_st 20 键 1776-3024（max 3024）。
**回填核对**：①WRONG_CHAIN_WIN=3660≥2496+300=2796 ✓（不动）；②right 单窗 2970≥2280+300=2580 ✓、
链窗 6480≥2280+150+3024+300=5754 ✓（不动——estMs 估值全在保守方向）；③教学 watch 演示窗
2100<right 实长 2280（截尾 180ms）→ **已修 2400**（game-main.js wait(2400*SPEED)）。

`estMs(s)=s.length*345+600`（家族 T 全字符口径）。段一无实长，全部窗用 estMs；段二注册后
回填点：①`WRONG_CHAIN_WIN`（现 estMs(8)+300=3660；错链=[zi_wrong] 单段）②uiPick 对窗
（right 链=[zi_right, chKey|zi_st]；现 right=estMs(6)+300=2970 精确、链窗=estMs(6)+150+estMs(尾段)+300）
③教学延窗（demo watch/听音演示 2100/1700ms≥right 2970×SPEED 的段一 SPEED=1 需回核查——
段二若 right 实长>2970 需同步放宽）。演出锁=真时钟 `state.showUntil`（wrong 锁总窗 800×SPEED+140，
b39 总窗口径：await 800×SPEED+200 覆盖锁窗）。救援：RESCUE_DIR_MS=14000 / RESCUE_ANS_MS=30000 /
RESCUE_ANS_REPEAT=15000（lastAns 独立锚）；keepIdle：救援两级均不刷 lastAct（build 源码级断言）。

## §R10 存档兼容（core v1.0 + zi 命名空间）

`kidsgame_zilearn`：core v1.0 全字段不动；新增 `save.zi = { tutSeen: bool, dayLog: { 'YYYY-MM-DD': [flat,...] } }`
（教学一次性标记+当日新关账——家长摘要「今日新字」=dayLog[今日] 各关 newChars 去重并集）。
家长面板摘要（面板注入，core panel 原样保留）：已学汉字=已过关 flat 的 newChars 并集数 /
今日新字 / 累计读句=已过 flat∈[10,20) 计数。旧档无 `zi` 字段=首次教学判定走 levels['1-0'] 兜底，兼容。

## §R12 r1 审查修复（2026-09-24，REVIEW-r1：fatal 0 / major 4 / minor 8）

- **M1** PICTO 26 字裸 path（无 svg 包裹）渲染全空白 → main 渲染端 `picSvg()` 补 `<svg viewBox="0 0 100 100">` 包裹；selftest 2a 补 `#w-side svg` 存在性断言（防回归）。
- **M2** 章末预告 off-by-one（flat4 章末返回 ch1 自己的 hint）→ `nextHint` 改 `ci=floor((flat+1)/CH_LEN)`（flat19 → ci=4 走 GEN 实算分支）。
- **M3** 多音字"长"words[0]=长大(zhǎng) 与 pyFull=cháng 自相矛盾 → words 重排长江打头/长大降惰性位；chars.json 双侧同步；`zi_ch_chang` 重合成（文案"长，长江的长"，13.8KB，gen_clips ok=1 fail=0）。
- **M4** 非 pic 124 字 glyph=null 渲染空气泡 → runWatch 三分支，无 glyph 加 `plainmode`（藏侧板+气泡，CSS 新增）。
- **minor**：m1 删零调用 sayR / m2 删死 CSS #w-word+注释更正 / m4 删 skipWatch 路径双播 / m5 selftest 注释 33→39 / m7 dayDone 重开停最深已通关（proceed 同语义）/ m8 章点 8 点滚动窗（生成关 ch 无界涨）。m3 时序措辞已勘正（上行 qi0 表）。
- §R11 数字已在 r1 rebuild 后刷新（md5/selftest 终态）。verify_voice 181 PASS 复验含重合成 chang 键。

## §R11 验收数字（2026-09-24 实测，交付终态）

- build 双跑幂等：`index.html` md5 `93df824de4278829ca21514c68ce3628` 两次一致（r1 修复后，含 M3 重合成 chang；段二态 `b396eee2`/`1d174b55` 已废）；对账门禁每次
  构建跑（CHARS/LEVELS/GEN_POOL/SENTENCES/REVIEW_SCHED ↔chars.json 双向全等+PICTO 26/8ev）。
- VERIFY：`VERIFY PASS 10/10`（交付产物复验同绿；50 关审计 static20+gen30 全 ok；深对账 9 flat；
  防泄露键账；救援直驱；autoSolve 7 taps；script 块==4；覆盖；日历；0 pageerror）。
- _selftest：**42/42 PASS**（r1 修复后全记录 `_r_zi_selftest_r1.log`；新增 2a qi0 picto svg 断言；段二态 41/41）：P2 真实页 flat0 真鼠标 7 taps
  0 miss 3 星+flat1/2 autoSolve taps=7+flat13 句子关（walk3+play4=7、累计读句账 4）+flat20 生成关
  （亮相恰 2 新字）+教学 看→操作→独（tutSeen 持久化/幽灵手指/soft 0-miss/1-0 落档）+救援真实
  时钟方向级重播；P3 双视口（1280×800 选项 118 / 800×1180 真竖屏 104，均 ≥96、分离 gap=6、
  overflowX=0、截图非空白）；P4 离线+0 pageerror；P5 变异 4 HIT。
- 变异 4 HIT（M1 seed/M2 日历表/M3 复习取字/M4 链窗下界，全 VERIFY FAIL）。

## §R13 r2 深度打磨（2026-09-25，诊断 9 场景 → 设计取舍 → 五项实施）

- 依据：诊断 agent 真实完整玩（9 场景 52 截图，zilearn-diagnosis.md）三大断点——J1 错误反馈零增益（错答无学习增量）、
  J2 关末缺结束感（celebrate 即走）、义线 83% 断裂（124 字无字理文案，教研专项不本轮做）。设计取舍表见 docs/literacy-game-design.md §四。
- **F1 关末生字墙**：winFlow 链插入 `runResultWall(run)`（celebrate→墙→pass→章末/日末；`run=cur` 快照贯穿 then 链防 late-cur）。
  本关新字翻牌（静态 5/生成 2/纯复习不弹），点卡播 `chKey/chText`=主动回忆第 4 认字形式；全点过 700ms 收 / 12s 家长侧超时兜底；
  `state.locked` 包夹防墙内答题。VERIFY 页不弹（`|| VERIFY` 守卫——verify 单元⑦ simView 不受影响）。
- **F2 阶梯错误反馈**：`roundMiss` 开题重置（half 推进=新题面重置）；错 1 走 sayW+WRONG_CHAIN_WIN；错 2 queue[wrong, zi_ch_目标+组词]
  +正确卡 breathe（豁免窗动态=estMs(wrong)+150+estMs(chText)+300）；错 3 `hideOneDistractor()` 摘 1 干扰（`.dimmed` opacity .18
  +pointer-events none，不删 DOM 保判定索引；alive>3 才摘）。
- **F5/F6**：VOICE 加 readHint（word/sentence 题面语音+qSub 文案）；兔子键 flat3+ 从静默 hint 改重播当前题面（watch 期/locked 除外）。
- **F7**：`Audio.prototype.play` wrap（wireVoiceLog 内，`pr.catch(()=>notePlayFail())`）——播放失败一次性 mute-tip toast
  （喇叭划线 SVG，show 3.2s，60s 节流）。家长可发现无声故障。
- 键账 178→**179**（zi_read_hint，gen_clips 注册+mp3 合成）；build EXPECT_KEYS 断言 179 + 新数据防劣化断言
  （150 字 words[0] 必含本字、干扰≠本字）。VERIFY **11/11**（新单元⑪ ladder：错 2 键账+breathe、错 3 dimmed 恰 1 且≠答案）。
- selftest 42→**44**（+生字墙 2 断言）；settle_win helper：F1 使通关链变长，原 4 处固定 3600ms 推进断言改为点卡过墙+4200ms 落账。
- L3 真实取证 4/4（shots-r2/ 四截图像素复核非空白）：F7 toast 真 reject 触发、F1 墙 5 卡点读过关推进、F2 breathe/dimmed。
- **r2 终态 md5 `02676bd9c8dde02db92e0a520f265b42`**（build 双跑幂等；§R11 的 `93df824d` 系 r1 终态，已被 r2 取代）。
- 测试方法论三坑（防再犯）：`.hide` 元素 playwright wait 须 `state='attached'`；Audio reject hook 须 init_script 阶段装
  （加载后 replace 会盖掉 wrap 层致 notePlayFail 永不触发）；墙内点卡须 force click（rotate 动画致 stable 检测 3-4s/张，
  5 张≈12s 撞超时兜底——MutationObserver 时间线实测墙开 47248ms→兜底收 59265ms，游戏行为正确非 bug）。
