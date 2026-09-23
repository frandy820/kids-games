# REVIEW-BATCH25 · 独立反方审查报告（story3 / emo / habitat，2026-09-09）

审查方式：阶段一六件源码逐条对照（含 core.js 语音通道语义、b24 参照款同构比对）+ 阶段二无头实测（playwright 独立 launch 真实页 hook `voice._mk/_stop/play/queue/speak` 与 speechSynthesis.cancel，autoplay 放行 clip 真实走时；Chromium 无 TTS voice，TTS 段时长以系统 SAPI Huihui zh-CN 双档计时为真值锚）。29 条 clip 实长已用 mutagen 逐条复测。

## 结论：4 Major / 5 minor

三款引擎层（确定性、封闭集真值、星级、防重入、布局、href、40 关结构审计）全部干净；**问题集中在语音链时序——判对/通关链的 TTS 段窗值系统性不足**，且属门禁盲区（verify 页将语音 stub 为 no-op、SPEED=0.12 提速，TTS 段实长从未被任何门禁量化）。

## Major

### M1 [emo] winFlow 的 emo_right（2976ms）被 celebrate 后的下一语音掐尾 ~350ms——每关必发
- 证据：`emo/_src/game-main.js:201-215`——`sayR(emo_right)` 后 `KIDS.ui.celebrate(stars).then(...)` 内无补窗直接 chapterEnd/dayEnd/proceed；core.js celebrate 于 2300+320=2620ms resolve，而 emo_right 实长 2976ms。运行时实测（flat2 通关）：`t=38200 play emo_right → t=40832 paused at=2561/2976`（clip 在 88% 处被 pause），丢尾 ~347ms（「抱抱小兔子」尾音）。章末路径 chapterEnd 的 clip 同样于 2620ms 处掐。
- 对照：habitat 同位置有 `await wait(400)`（habitat main:246，且 build.py:58 有断言护栏），实测 hab_right `2544/2544` 自然播完；story3 的 sto_right 在题内链播完后才 winFlow，无此问题。三款中唯 emo 缺失且 build.py 无对应断言。
- 修复：winFlow 的 celebrate().then 内先 `await wait(700)`（2620+700=3320 ≥ 2976+300）再走 chapterEnd/proceed；emo build.py 补 `await wait(700)` 断言。

### M2 [emo] 判对链确认句 TTS 实长 4281-4825ms，链窗 3500 只罩 40-44%——确认句过半被下一题读题掐断
- 证据：链=`queue([emo_w 词 clip, 150ms, 确认句 TTS])`（main:179-181），窗 `RIGHT_CHAIN_MS=3500`（data 注释估算「确认句≈1500ms」≈115ms/字）。SAPI Huihui 实测（Rate-1≈Chrome rate 0.9）：12 字 4281-4355 / 13 字 4696 / 14 字 4825ms——链实长 5775-6463ms。运行时实测（flat2 q0）：`311 queue → 1756 词 clip 自然 ended → 1917 确认句开始 → 3820 下一题 say+cancel`——确认句只播 1903ms 即被掐，丢 ~56%；末题场景确认句播 1885ms 即被 winFlow 的 emo_right 掐（丢 56-61%）。「，小兔子很生气」这类情绪确认几乎听不全，§0.59 的确认环节实质失效。
- 修复：窗提至 ≥6800（最长组合 6463+300）；根治=按句长动态窗（参照 story3 estMs 模式，系数用实测 ~345ms/字+余量）。

### M3 [habitat] 判对确认句实长 4240-4899ms > 演出窗 3600−余量，尾 640-1300ms（15-27%）被下一题读题掐
- 证据：窗=`wait(1800)+wait(1800)`=3600（main:220-223），注释称「确认句 TTS ≤13 字≈3.2s」——实测最长 15 字（啄木鸟「啄木鸟住在森林里，笃笃笃敲树干」，collect 实测 confirmN=15；frog/whale 14），注释与数据不符。SAPI：fish(12字) 4240 / frog 4690 / whale 4796 / woodpecker 4899。运行时（flat2 q0 fish）：`312 say(确认句) → 3927 say(下一题 ask)`，间隔 3615ms → fish 尾 625ms 被掐；15 字句丢 1284ms（26%）。末题确认句同样被 hab_right 于 3611ms 处掐。
- 修复：演出窗提至 ≥5200；或动态窗。教学期 turn 收束（3600+500=4420）对 fish（4240）勉强安全（margin 180ms），若改长句动物做锚点需同步核。

### M4 [story3] 复述链后题面双读：链长 >14s 时链尾读题被 14s 方向级救援立即叠读（第一遍只播 293-512ms 就被掐）
- 证据：链=560+estMs(复述)+3150；estMs>~10300 的故事（laundry 11100 / wake 10800 / chick 10500）链 14510-14810ms 超过 14s 方向级阈值，meals（13610+开销）实测也过线。救援 interval 只看 idle（lastAct=末槽点对时刻）与 lastDir，不看「链尾刚读题」——renderQuiz 的 sto_q 开播后 1s 内 tick 判 idle>14000 触发方向级再播（speakQuiz 主动路径不重置救援锚）。运行时双实锤：laundry（flat3）`17011 读题 → 17304 救援重读`（第一遍仅 293ms）；meals（flat10）`17835 → 18347`（512ms）。救援「静置 14s 才帮」的语义被长链破坏——刚答完题的孩子立即被当作挂机，题面连读两遍。
- 修复：renderQuiz 换题读题与 startLevel 开场读题路径 `lastAct=Date.now()`（救援自身触发的读题仍不重置，防自喂——两路径区分）；或方向级 idle 锚取「max(lastAct, 最近语音播报起点)」。

## minor

- m1 [story3] ch3 错反馈追加的 TIME_HINT `setTimeout`（main:213-217）无句柄、对选后不取消：错点（仅 slot0/1 可错）后 1000-2580ms 内点对会在新状态插入 6993ms（SAPI）的时间词点名，打断复述句/新题面。触发需「错点后 ~1.2s 内连点两次正确」的低概率操作。建议 timer 句柄化+对选时 clearTimeout。
- m2 [emo] verify ⑨ 弱断言：注释宣称「dch2 目标全 6 池」，实断 `>=4`；引擎实测 flat5-9 恒 distinct=6，可收紧为 `===6`。
- m3 [三款] 判对语音链为门禁盲区：story3 复述句 verify 页被 `!VERIFY` 抑制（vlog 代行）、emo/habitat 确认句 TTS 在 verify 页 stub 为 no-op 且 SPEED=0.12——TTS 段实长无任何 build 前量化（家族 H 只覆盖 clip），这是 M1-M3 全部漏网的共同根因。建议：TTS 拼句统一 estMs 动态窗+verify 加「窗≥estMs」静态断言。
- m4 [story3] estMs 系数（300ms/字+900）在本机 SAPI 罩住实测（laundry 11100 vs 10241），但移动端 TTS 每字 >330ms 时 sto_right 将掐复述尾——环境相关风险，记录为已知接受项。
- m5 [三款·家族既有] 启动 dayDone 路径 dayEnd 的 core_day_end clip 播出 <1s 即被 startLevel 开场读题掐。三款同款且与 b24 shaperoof 同构，非本批引入，不计本批违约。

## 已查无（负空间）

- A dayEnd nextHint 两式等价合规：story3/emo 启动+winFlow 均 lim-1（build 断言=2）；habitat 启动 lim-1+winFlow null（build 断言=1+在场）。
- B 救援双锚三款同构合规（lastDir 独立节流不写 lastAct、答案级自重置）；emo 真实页 45s 实测节律 14s/14s/30s/14s 与设计完全一致，locked/demo/won 期全跳过。
- C/D/E/F 存档 v:'1.0'、吞输入 pop+容器 bump 四路全覆盖、教学仅 flat0 首见（tutSeen 持久化）、章末预告 hint[i]↔CHAPTERS[i+1] 与 GEN_HINTS[k]↔dch=k+1（verify C7 关键词断言在场）。
- G 教学演示不与链撞头：emo tap 延至 3600≥2952+300、habitat 3444≥3144+300，实测无撞头；story3 无 queue（复述走 say，规避 b24 M1 雷型）。
- H 29 条 clip 实长 mutagen 逐条复测与 SPEC §4/data 注释完全一致（无虚报）；habitat winFlow wait(400) 实测有效。
- 三真值：story3 库 12×3 帧互异+复述句逐字拼装+槽位语义按当前槽（verify ⑤ 真实链断言）；emo 情绪 6 封闭+24 情境唯一映射+ch3 近对在场+六型脸两两 ≥2 维互异（SVG 结构签名）+反馈不否定人格；habitat 环境 7+动物 15 唯一 home+近环境三对在场+反馈绑定所点环境（verify __lastVoiceKey 双环境断言）。40 关全量引擎复扫：相邻互异/情境不重/近对不缺/home 自洽/非恒等排列 0 违规。
- 确定性 seeded、星级三档永不 0、错选 1000ms 防重入、watch ≤16s（真实折算 8.4-8.7s）、单文件离线（build 断言）、主入口 75 卡+batch25 三卡 href 全存在、生成关四型分布全现。
- 方法论实证（供 b26+）：mp3 尾 padding 使多 clip 的 base64 尾 60 字符碰撞（本审查 hook 两度误标 sto_q↔sto_w_mid、emo_w_sad↔emo_w_surprised），**clip 身份反查必须以 duration 为真值辨别器**，尾缀法不可单独使用——b24 教训的精确机理。

修复优先级：M2 > M1 > M3 > M4（M2 每题必发；M1 每关一次；M3 每题丢尾比例小；M4 特定故事+听感混乱）。四项均为常数级改动，不动判定引擎。
