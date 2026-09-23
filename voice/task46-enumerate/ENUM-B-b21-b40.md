# Task#46 语音 keyless 点静态枚举 — B 组（batch21-batch40，60 款）

> 枚举 agent 静态扫描（2026-09-19）。扫描口径：每款 `_src/game-main.js / game-data.js / game-core.js`。
> keyless 判定=①`KIDS.voice.say(...)`（含路由到 say 的本地封装）②`voice.queue([{key:null,...}])` 段 ③代码引用但 manifest 缺失的键（运行时落系统 TTS）。`voice.play(key,text)` 走 manifest 键的不算。

## 逐款清单

### batch21
**b21/bridge**
- 点1: game-main.js:411 `KIDS.voice.say(chantText(q))` 语境=找错题 pattern 领读 域=色短名5(红蓝绿紫橙)×形2(方/圆)→15 token+尾句「，有一块不对哦」 预估=16 段键（全句组合爆炸，只能段键拼播）

**b21/bubble**
- 点1: game-main.js:175 queue `{key:null,text:quizSpeech}` 语境=超时题面重读 域=N∈3-8×3色=18 全句
- 点2/5/6: 206/461/484 `say(quizSpeech(q))` 语境=读题/戳兔重读/再听 域=同上18（同键复用）
- 点3: 289 `say(numCn(q._cnt))` 语境=点泡跟数 域=数词1-8 → 8 键
- 点4: 425 `say('数够了就拍拍小兔子')` 固定句 1 键

**b21/feed**
- 点1: 90 `say(speechOf(q))` 语境=读题 域=quizSpeech「喂小兔子N量名」N∈6-10×3食物=15 全句；combo 拼句另需段键13 → 28
- 点2-4: 308/325/344 `say(numCn(r))` 语境=碗内计数/倒读/剩余 域=数词0-10 → 11 键
- 点5: 457 `say('多啦，放回去一根')` 1 键

小计 b21：12 点 / 预估 83 键

### batch22
**b22/colormix**
- 点1/4/5: 57/311/326 `say(quizSpeech(q.target))` 语境=读题/重读 域=「调出C吧」C∈8色 → 8 键
- 点2: 190 `say(COLORS[color].name)` 语境=点颜料报名 域=8 颜料名 → 8 键
- 点3: 283 `say('变绿啦')` 1 键

**b22/hidden**
- 点1/4/5: 116/386/401 `say(quizSpeech(q))` 语境=读题/重读 域=单类「找一找藏着几只A呀」6 动物→6 全句；双类拼句段键13 → 19
- 点2: 257 `say('这不是A呀')` 域=6 动物 → 6 键
- 点3: 324 `say('看到耳朵尖了吗')` 1 键

**b22/slide** ⚠️ 含缺键型
- 点1/2: 71/240 queue `{key:'sli_q',text:quizSpeech()}` — **sli_q 不在 manifest**（manifest 仅 5 个 sli_ 键），运行时落系统 TTS。文本恒定「把小兔子的照片拼好吧」→ 补 1 键
- 点3: 68 封装 `speakQuiz()`（160/360/397 三站）同文本，复用同 1 键
- 点4: 310 `say('空格旁边的，才能滑')` 1 键

小计 b22：13 点 / 预估 45 键

### batch23
**b23/piano** — 点1: 389 `say('弹得真像')` 1 键
**b23/share**
- 点1: 24 封装 `sayQuiz(q)`（76/377/419/435/452/521 六站）域=N∈{2..12}11值×K∈{2,3} → 22 全句
- 点2: 247 `say(numCn(碗内数))` 点3: 299 `say(numCn(r))` 域=数词0-12 → 13 键（共用）

**b23/weather**
- 点1: 82 `sayTextR(q.stem)` 语境=读题 域=题面 stem 封闭 17 句 → 17 键
- 点2/3: 369/384 `sayWText(SUBMIT_TEXT.less/more)` 2 键

小计 b23：7 点 / 预估 55 键

### batch24
**b24/dressup** — 点1: 78 `say(quizSpeech(q))` 域=budget6+anti6（同文案）+THEMES.q6 → 12 唯一句
**b24/shaperoof** — 0 点（play 全 clip）
**b24/trace** — 0 点（stemParts 走 tra_n_1..10，manifest 全覆盖已核）

小计 b24：1 点 / 12 键

### batch25
**b25/emo**
- 点1: 67 `say(SCENES.ask)` 语境=情境读题 域=24 场景句 → 24 键
- 点2: 180 queue `{key:null,text:confirmOf}` 语境=确认句 域=cue+情绪=24 → 24 键

**b25/habitat**
- 点1: 75 `say(quizText(q))` 语境=读题 域=7 题型：动物名20+食物名6 拼句+chain/hib(2)/struct(4)/dual 固定句 → 段键约 40
- 点2: 300 `say(confirmText(q))` 同族拼句，复用段+确认骨架 → 增量约 0-5

**b25/story3**
- 点1: 218 `say(TIME_HINT)` 固定句 1 键
- 点2: 252 `say(recapOf(id))` 语境=复述句 域=12 故事×「先X然后Y最后Z」→ 12 全句

小计 b25：6 点 / 101 键

### batch26
**b26/calendar**
- 点1: 40 `say(dirText(q,word))` 域=星期7+月12 词+序数骨架
- 点2: 75 与 点3: 82 queue `{key:null,quizText}` 域=19 词×4 题型骨架 → 合计 19 词+4 骨架
- 点4: 204 `say(confirmText)` 域=同 19 词+2 确认骨架（词复用）
- 点5/6: 323/362 `say('想想它的前面是谁')` 1 键
小计 26 键

**b26/season**
- 点1: 76 `sayTextR(q.stem)` 域=TEMPS3×OCCS4=12+anti3 → 15 键
- 点2: 275 `sayWText(ANTI_ANCHOR[q.band])` 3 键
- 点3/6: 295/365 `say(confirmOf(q))` 域=anti3+normal12 → 15 键
- 点4/5: 327/343 `sayWText(SUBMIT_TEXT)` 2 键

**b26/sign**
- 点1: 184 queue `{key:null,GUIDE[fam]}` 域=5 → 5 键
- 点2: 204 `say(confirmText)` 域=SIGNS 12 条含义句 → 12 键

小计 b26：15 点 / 78 键

### batch27
**b27/coin**
- 点1: 81 `say('哪个和它一样多？')` 1；点2: 83 `say(COMBOS[face].say)` 3；点3: 238 queue guideFor 域≈5；点4: 258 `say(confirmOf)` 域=面额8+sameval2+combo3 → 13。计 22 键

**b27/notebird**
- 点1: 126 `say('谁的声音高？')` 1；点2: 264 queue guide 域=3；点3: 285 `say(confirmText)` 域=NOTES 7 色名×2 句式 → 14；点4: 371 `say(MAIN_LINE)` 1。计 19 键

**b27/ruler**
- 点1: 77 `say(quizText)` 域=ITEMS5×UNITS3=15 全句+cmp1；点2: 206 queue guideText 域=GUIDE 5；点3: 226 `say(confirmText)` 域=段键(物5+单位3+数词12)。计 23 键

小计 b27：11 点 / 64 键

### batch28
**b28/coder**
- 点1: 83 `say(pathSpeak)` 域=段键(数词3+方向4+骨架)→8；点2: 244 `say(GUIDE.block)` 1；点3: 263 queue guideText 域=run_wrong{d}4 向+1 → 5；点4: 285 `say(demo句/confirmText)` 3。计 17 键

**b28/conserve**
- 点1: 116 PRE_SAY 1；点2: 120+322 `say(T_SAY[family])` 3；点3: 125 `say(addSayOf)` 域=4-6；点4: 218 queue guideOf 段键≈9；点5: 238 `say(confirmOf)` 段键≈7。计 26 键

**b28/shapecount**
- 点1: 86 queue quizText 域=4 题型句；点2: 226 queue guideText 域=4；点3: 246 `say(confirmText)` 域=NUMCN1-20+骨架→21；点4: 344 `say(NUMCN[2(g+1)]+'个')` 域=两/四/六→3。计 32 键

小计 b28：14 点 / 75 键

### batch29
**b29/bodyen** — 3 点（90/221 HEAR_AGAIN、222 SEE_AGAIN）/ 2 键
**b29/poem** — 1 点：198 queue guide（GUIDE_NEXT/GUIDE_HEAR）/ 2 键
**b29/wordpuz** — 2 点：218 queue GUIDE.wrong、243 `say(DEMO_SAY)` / 2 键

小计 b29：6 点 / 6 键

### batch30
**b30/babylove** — 1 点：232 queue AGAIN_OF[kind] / 4 键
**b30/maze** — 3 点：236 queue GUIDE.guide、254 GETKEY_SENT、293 DEMO_SENT / 3 键
**b30/storybed** — 1 点：258 queue guide（wrong/distract/miss 三句族）/ 3 键

小计 b30：5 点 / 10 键

### batch31
**b31/animalmenu** — 4 点：290/292/294/296 queue 四 AGAIN 常量 / 4 键
**b31/chartread**
- 122 TAIL_HOWMANY+124 TAIL_COMPARE：2 键；126 queue q.text.slice 域=constraint/twocompare 9 全句；325 again 域=8 AGAIN 常量；397/399/401/403 queue NUMCN 确认句 段键≈15。计 34 键

**b31/iftrain** — 1 点：251 queue BACK/AGAIN 二常量 / 2 键

小计 b31：13 点 / 40 键

### batch32
**b32/evidence** — 2 点（297/340）：queue WRONG_AGAIN 同文本 / 1 键
**b32/robotdance** — 0 点（全 clip）
**b32/senses** — 1 点（wrongParts 函数 215/217/219/221 四分支）：MULTI 1+ANTI 拼句15（BASE+15 物感官名+TAIL）+COV 1+SENSE/THING 2 / 19 键

小计 b32：3 点 / 20 键

### batch33
**b33/position** — 2 点：78 queue PLACE_TTS[q.ask] 域=6 方位全句；299 queue '呀' 1 → 7 键
**b33/robotpaint** — 1 点：358 queue MEM_TEXT / 1 键
**b33/soundcount** — 0 点（全 clip）

小计 b33：3 点 / 8 键

### batch34
**b34/datacollect** — 2 点（115/116）：queue confirmText 域=5 骨架×NUMCN 段 → 15 键
**b34/hidecup** — 1 点：175 queue `{key:null,text:VOICE.show.text}` — **hc_show 已在 manifest（text=要躲猫猫啦）**，代码却传 key:null 绕过现成 clip → **0 新键，改引用即可**
**b34/sentorder** — 3 点：83 `say(q.text)`、218 `say(w)`、257 queue q.text。域=SENT_BANK 20 句+唯一词约 70 → 90 键

小计 b34：6 点 / 105 键

### batch35
**b35/errdoc**
- 点1: 244 queue hintTTS 域=「这里应该是」+NUMCN/OP词 → 全句 24
- 点2: 301 queue eqTTS 域=算式全式组合爆炸 → 段键（NUMCN20+OP4+等于1）25
计 49 键

**b35/maketen** — 1 点：222 queue formulaText 域=「A加B等于T」target∈{10,15,20} 配对解 → 全句 21 键
**b35/turntake** — 0 点

小计 b35：3 点 / 70 键

### batch36
**b36/comfort** — 2 点（166/467 同 q.say）：域=SCENES 16 唯一情境句 → 16 键
**b36/quickcmp** — 1 点：299 queue「左边N个右边M个」域=N,M∈1-10 → 段键 13（全句 100 不取）
**b36/tictac** — 0 点

小计 b36：3 点 / 29 键

### batch37
**b37/plant** — 2 点（166/187）：`say(cardText)` 域=第X行第Y列 X,Y∈1-4 → 16 全句
**b37/teach**
- 227/700/706 `say(taskTTS)` 域=「教小兔子数N个苹果」N∈2-20 → 19 键
- 231 GROUP_HINT_TTS 1；316 `say(groupTTS)` 域=NUMCN[1-20]+个 → 20；337 GROUP_MODES.label 3；357 rabbitTTS 1
计 44 键

**b37/thanks** — 2 点（159/469）：域=SCENES 20 情境句 → 20 键

小计 b37：11 点 / 80 键

### batch38
**b38/gear** — 2 点（209/233）：域=obs 4 观察句 → 4 键
**b38/libr** — 3 点（142/222/407）：域=NORM_HINT 1+DIM_HINTS 4 → 5 键
**b38/stamp** — 0 点

小计 b38：5 点 / 9 键

### batch39
**b39/cir** — 2 点（340/363）：域=obs 4 句 → 4 键
**b39/crd** — 2 点（179/492）：域=情境句 20 → 20 键
**b39/etm** — 3 点（148/214/402）：域=情境句 text 25 条 → 25 键

小计 b39：7 点 / 49 键

### batch40
**b40/brk** — 2 点：163 queue TMPL 1 键；448 `say(cards[ci].label)` 语境=帮助阶段读卡 域=40 卡步序 label → 41 键
**b40/cbx** — 2 点（143/403）：域=情境句 20 → 20 键
**b40/ins** — 2 点（143/384）：queue SAY_T[kind] 域=judge/legs 2 → 2 键

小计 b40：6 点 / 63 键

---

# 汇总表（B 组 b21-b40）

| 指标 | 数值 |
|---|---|
| 总 keyless 点 | **150** |
| 总预估新增键 | **≈1002**（含段键方案；全句键为主的点已注明） |
| 零 keyless 款 | 7 款：shaperoof、trace、robotdance、soundcount、turntake、tictac、stamp |
| Top5 大头款 | **sentorder 90 键 > errdoc 49 > emo 48 > teach 44 > brk 41**（feed 40 第六） |

**三个特殊发现**
1. **b22/slide 缺键**：`sli_q` 在代码两处 queue 引用但 manifest 无此键（只有 5 个 sli_tut/hint/right/wrong），运行时静默落系统 TTS——补 1 键即修。
2. **b34/hidecup 零成本修复**：`hc_show`（"要躲猫猫啦"）已在 manifest，175 行却写 `{key:null,text:VOICE.show.text}` 绕过现成 clip，改传 `VOICE.show.key` 即消灭，不新增键。
3. **say 路由封装 4 处**：season/weather 的 `sayTextR/sayWText`、share 的 `sayQuiz`、slide 的 `speakQuiz`——这些封装内部就是 say sink，改造时封装层改 play(key) 可一次覆盖全部调用站。

**对账数字（防漏口径）**
- 60 款×3 源文件字面计数：`KIDS.voice.say(` 99 处、`voice.queue(` 196 处、`voice.play(` 139 处（含 sayP/sayR/sayW 节流封装的内嵌调用，即同一 sink 的多行；不含 game-verify.js 断言串）。
- 150 个 keyless 点 = say 型站点（直接调用行 + 4 个 say 封装函数体的全部调用站）+ queue `{key:null}` 段 62 处代码行 + sli_q 缺键 2 处。
- 其余 queue/play 站点全部走 manifest 键：**31 个动态键前缀族**（tra_n_/emo_w_/anm_n_/bab_n_/poe_line_/brk_t_/ins_a_/cbx_g_ 等）逐一对照 manifest 核过覆盖；**全部字面量键**交叉核验仅 sli_q 一条缺失（animalmenu 的 banana/mix、iftrain 的 rain/cold、weather 的 a_/w_ 为非语音 id，已排除）。
- 已核 manifest（2244 键）无重复计入：本清单全部为增量，hidecup 1 点为改引用零新增。

**风险/未验证项**：键数为静态域推算（拼句族给的是段键方案数，全句键数会在 feed/habitat/errdoc/maketen/quickcmp 等组合爆炸点显著更大，实施前需定拼播策略）；行号以当前 `_src` 为准，rebuild 不变源文件不影响。
