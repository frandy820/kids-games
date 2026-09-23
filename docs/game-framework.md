# kids-games 公共能力框架说明

> 面向 5-8 岁的 120 款离线 HTML5 单文件游戏（vanilla JS，零依赖、零网络、零账号）。
> 真值源：`design/core.js`（VER '1.0'，414 行）+ `design/DESIGN-SPEC.md` + 样本款源码（batch40/cbx、batch6/words）。
> 本文只陈述已实现的事实；凡未实现处如实标注（汇总见 §6）。API/函数名均为 core.js 真名。

---

## 1. 总览（架构）

```
design/                            共享层（唯一契约源）
├─ DESIGN-SPEC.md                  共享契约：产品硬约束 / 会话结构 / 存档 schema / 各款设计
│                                  （注：§1 的 speechSynthesis TTS 描述已被 Task#46 覆盖，以 core.js 代码为准）
└─ core.js                         公共内核 KIDS（VER '1.0'）——构建时全文原样内嵌进每一款

voice/                             语音流水线
├─ gen_clips.py                    edge-tts 晓晓批量合成 → clips/<key>.mp3 + manifest.json
├─ clips/ + manifest.json          约 5517 条 mp3 资产；key → {text, games[]} 中央登记
└─ inject_clips.py                 clips → base64 → KIDS.voice.clips 单行注入

batchN/<game>/（N=1..40，每批 3 款，共 120 款）
├─ index.html                      交付物：自包含单文件（离线可玩，语音 base64 内嵌）
└─ _src/                           构建源五件套 + 门禁
   ├─ head.html                    页面骨架与 CSS
   ├─ game-data.js                 纯数据（题库/词表/曲谱）
   ├─ game-core.js                 纯引擎（无 DOM）：mulberry32 确定性关卡生成 + 判定，UI 与 verify 共用
   ├─ game-main.js                 主逻辑：UI/演出/教学/救援/语音链/KIDS 接入
   ├─ game-verify.js               ?verify=1 自检页（结构/驱动/谱对拍/双视口布局）
   ├─ build.py                     拼接构建 + 硬性检查
   └─ _selftest.py / SPEC-*.md     真实页自测门禁 / 款规格书

index.html（根）                    120 款总目录「小兔子的游戏屋」：三年龄段带（5-6/6-7/7-8）+ 年龄筛选
```

分层职责一句话：**core.js 管"跨款一致的底盘"（存档/日历/计时/音效/语音/仪式/家长面板）；每款 game-core.js 管"确定性玩法引擎"；game-main.js 管"演出与支架"；voice/ 管"语音资产生产"；build.py 把四层拼成一个文件。**

零网络是构建期硬约束：产物中除 SVG xmlns 命名空间标识符外，禁止任何 `http(s)://`、`<link`、` src=`、` href=`（build.py 硬性检查）。

---

## 2. 八项公共能力对照

| # | 任务书标准名 | 本项目实现 | 所在层 | 状态 |
|---|---|---|---|---|
| 1 | GameShell（开始/暂停/重开/返回/结算） | 结算仪式三件套（celebrate/chapterEnd/dayEnd）+ 无菜单直进教学 + 款侧重开按钮 | core.ui + 款侧 | 部分等价（无暂停/返回按钮） |
| 2 | GameSession（本局时间/步骤，不联网） | session 前台计时入 dailyMin + levels 记录；本局模型在款侧 | core.session/level + 款侧 | 等价 |
| 3 | DifficultyManager（按年龄/表现调难度） | 章谱静态 dch 配置 + 救援双锚动态支架；**无自适应算法** | 款侧 game-core/main.js | 降级等价（如实声明） |
| 4 | FeedbackSystem（反馈+静音） | audio 合成音效 + voice clip 反馈链 + 静音三开关 | core.audio/voice | 等价 |
| 5 | RewardSystem（确定性奖励） | 星级 3/2/1 永不 0 星 + 章末印章；无抽卡无随机 | core.level/ui | 等价（全确定性） |
| 6 | ParentSettings（家长入口） | 两位数加法门 + 家长面板（统计/开关/多玩/存档管理） | core.parent | 等价 |
| 7 | Accessibility（大点击区/形状区分/关音效…） | 触摸目标硬约束 + SVG 形状区分 + 静音 + Pointer Events 键鼠兼容 | DESIGN-SPEC + core + 款侧 | 部分等价（无 reduce-motion/键盘） |
| 8 | LocalStorage | `kidsgame_<game>` 单键 JSON + 损坏重置 + 家长面板清档/导入导出 | core.store/parent | 等价 |

### 2.1 GameShell

core 提供的是"结算仪式三件 + 家长入口"，**不是完整 shell 状态机**：

- `KIDS.ui.celebrate(stars)` → Promise：过关仪式，金星逐颗弹入（0/0.12/0.24s 递延）+"真棒！/好棒！"+开心兔，2.3s 自动收起。类名 `k-celebrate` 供验收断言。
- `KIDS.ui.chapterEnd({chapter, stars, nextHint})`：章末——绿圆星盖章动画（k-stamp）+"第 N 章 完成！"+本章星星合计+明日预告文案+「明天见」按钮；触发 `audio.sfx('win')` 与 `voice.play('core_chapter_end')`。
- `KIDS.ui.dayEnd({nextHint})`：日终——挥手兔+"今天的新关卡玩完啦"+「再玩玩旧关卡 / 明天见」双选（**不锁死**，收尾画面可关闭继续重玩旧关）。
- 覆盖层幂等：`ui._ov(cls)` 创建前先移除同 cls 旧层（b14 试玩修复：日终后重玩又通关曾向 body 叠加 7 层同名层）。
- **开始**：无标题菜单，首次进入直接进教学关（幽灵手指示范一次操作再等模仿，DESIGN-SPEC §2.6——设计选择而非缺失）。
- **重开**：core 无统一 API；款侧约定 replayBtn（cbx：`replayBtn` pointerdown → `startLevel(cur.flat)`，同 flat 确定性同题）+ dayEnd 的"再玩玩旧关卡"。
- **暂停**：无暂停按钮。等价机制两条——①任何覆盖层（结算/休息/面板）在场即整体遮挡交互，救援也静默（契约 K）；②`session` 的 visibilitychange 在切后台时停计游玩时长。
- **返回**：无款内"回目录"按钮；总目录为根 `index.html`（三年龄段色带 + 出生月份年龄筛选），靠浏览器返回。
- **主入口**：根 index.html 按年龄段分带（.b56 橙 / .b67 绿 / .b78 蓝），各 batch 另有段入口。

### 2.2 GameSession

- `KIDS.session.start()`：启动 20 秒 tick 计时器；`settle()` 把前台分钟增量写入 `save.dailyMin[日期]`。
- **只计前台时间**：tick 中 `document.hidden` 直接跳过；`visibilitychange` 切走时 settle 入账并记 `hiddenAt`，回访时 `t0 += 隐藏时长` 平移起点（隐藏时间不计费）。
- **休息提示（防沉迷，软性）**：当日累计 13 分钟、25 分钟各提示一次（`save.restTip = {day, shown}` 按日清零）→ `KIDS.ui.restTip()` 困倦兔"小兔子的眼睛要休息啦"，`audio.sfx('pop')` + `voice.play('core_rest')`；点击"好的"可关闭继续，**不强制锁**。
- **本局步骤/状态**：core 不提供。每局模型（如 cbx 的 `cur = genLevel(flat)` 产物，含 step/retries/done）由款侧 game-core.js 持有；core 存档只记关级结果 `levels['章-关'] = {stars, plays}`。
- **不联网**：无任何上报/遥测；离线性由 build.py 构建期断言保证。

### 2.3 DifficultyManager（如实：无自适应算法）

难度由两层构成，均**不在 core.js**：

1. **章谱静态层**（款侧 game-core.js，每款 SPEC 记谱）：难度章号 `dch` 显式声明。以 cbx 为例：静态 20 关 `dch = flat//5 + 1`；生成关（flat≥20）`dch = ri(rnd, 1, 4)`（mulberry32 seeded 随机，同 flat 永远同关）。关卡种子 `mulberry32(flat * 7919 + 款常量)`——重玩一致、verify 可独立复算。
2. **救援支架动态层**（款侧 game-main.js 的家族约定，见 §3）：14s 方向级 / 30s 答案级双锚，卡住即降支架，**这是唯一的"动态降档"机制**。

- 星级不回灌难度：`KIDS.level.stars` 只作记录与展示，不改变取题。
- 年龄分段靠**款间分带**（三个年龄段各 40 款、学段标称难度不同），非款内按年龄参数化。
- 难度改造期（Task#45）：对 86 款（红 40 + 黄 46）逐款加深到学段标称难度——撤支架、加近对干扰、上探认知负荷，每款过独立复验+反方审查+无头试玩三轮门禁。

### 2.4 FeedbackSystem

- **音效** `KIDS.audio`：Web Audio 全合成马林巴音色（`note` = 基音 + 2.9 倍泛音 + 指数衰减，无音频文件）。`sfx(name)` 六种：`ok`（双音上行）/ `win`（五音上行）/ `fail`（196Hz 柔和低音，不惊吓）/ `click`（高通噪声短脉冲）/ `pop` / `coin`。首次 pointerdown `audio.unlock()` 解锁 AudioContext。
- **语音** `KIDS.voice`：预合成童声 clip 优先（5517 条资产，见 §4）。
  - `play(key, text)`：停上一条再播；有 clip 播 clip，缺 clip 走 `speak(text)`（见下）；自动播放被浏览器拦截则回退。
  - `queue(parts)`：拼接句顺序播报，`parts = [key 或 {key, text}]`，段间 0.15s 停顿（替代标点停顿）；缺 clip 且无文本=放弃整句（不逐段混搭）。
  - `say(text)`：强制动态通道——**Task#46 阶段 3（2026-09-20）后 speak 仅 console.warn 静默**，系统 speechSynthesis 已彻底删除（消灭机械音/音色跳变；残余 keyless 调用=无声+控制台告警）。
- **反馈链纪律**（款侧契约，core 提供通道）：确认链/错链/辨析链全 clip 化；错链豁免窗 `wrongChainUntil`（真时钟，链播完前救援不掐断——契约 I）；纠错链节流 flat<3 每错必播、flat≥3 走 10s 节流（契约 J：语义句禁切通用 clip）。
- **静音**：家长面板 `settings.sound`（音效总开关，`audio._vol()` 归 0 即全静默）、`settings.tts`（语音开关）、`settings.vol`（音量 0-1，clip 播放器音量实时跟随）。verify 页内另有 `SPEED=0.12` 演出提速与 sfx 短路（不污染音频断言）。

### 2.5 RewardSystem（全确定性）

- **星级**：`KIDS.level.pass(ch, lv, stars, chapterLevels)`——星级取**历史最大保留**（`stars: Math.max(prev, cur)`）、`plays+1`，返回 `{chapterDone}`（本章全部关有记录时 true）。
- **星级口径款侧自定**（cbx `engStars`：全关 0 错=3★ / 1-2 错=2★ / ≥3 错=1★，**永不 0 星**——失败零惩罚红线）。
- **章末奖励**：`chapterEnd` 绿圆星盖章动画 + 本章星星合计展示。
- **累计**：家长面板"累计星星"= levels 全量 stars 求和；"已完成关卡"= levels 键数。
- **确定性声明**：无抽卡、无随机奖励、无货币/内购——一切奖励来自通关表现，同关同表现必同星（种子确定性保证）。

### 2.6 ParentSettings

- **入口**：`KIDS.parent.init()` 在 init 时注入固定右上角 44×44 半透明 👪 按钮（低调不吸引儿童，带 aria-label）。
- **家长门** `parent.gate()`：**两位数加法**——两个加数各在 11-50 随机（10 以内加法是幼儿园大班常规内容，挡不住目标年龄段儿童）；屏上数字键盘 0-9 + ⌫ 输入（不弹系统键盘）；答错清空"再试一次"，无次数限制无锁定。
- **面板** `parent.panel()` 能设/能看的全部内容（以 core.js 实际代码为准）：
  - 统计只读：首次游玩日 / 最近游玩日 / 已完成关数 / 累计星星 / 今日游玩分钟 + 近 7 日每日分钟列表；
  - 控制：声音开/关、语音开/关、音量滑杆（0-100 实时持久化）；
  - **今日多玩关数**：手动输入 0-30（`calendar.bonusSet(n)` 替换语义，当日生效——家长在场时灵活放宽，不必等明天）；
  - 存档管理：导出 JSON 下载 / 导入（校验 `v` 与 `game` 匹配）/ **重置进度**（confirm 确认 → `localStorage.removeItem('kidsgame_<game>')` → reload）。

### 2.7 Accessibility

已实现：

- **大点击区**：触摸目标 ≥64×64 CSS px 且间距 ≥16px（DESIGN-SPEC 交互红线）；core `.k-btn` ≥72×72；cbx 策略卡 verify 断言 ≥96×96。
- **形状区分**：内容全 SVG 图形（策略卡=形状+图标+文字三通道，不靠纯颜色传义；r50 起按 kind 统一 aria-label 防泄答案）。
- **关音效**：家长面板 sound/tts/vol 三级控制。
- **键鼠兼容**：统一 Pointer Events（触屏/鼠标同一事件流）；单击=pointerdown 触发不等 pointerup（儿童按住不放也响应）；`touch-action:none` 防双指缩放。
- **零文字依赖**（第一档）：指令=图标+动画示范+语音；界面文字仅出现在家长面板内。
- **对比度**：verify 断言描边对比度 ≥3:1；无频闪（不出现 >3 次/秒对比闪烁）。

未实现（如实）：见 §6 第 5-7 条。

### 2.8 LocalStorage

- **键名**：`kidsgame_<game>`（game = `KIDS.init({game})` 传入的款 id，如 `kidsgame_cbx`）；单键 JSON。
- **schema**（core VER '1.0'，字段以代码为准）：

```js
{
  v: '1.0', game: 'cbx',
  firstDay: '2026-09-21', lastDay: '2026-09-22',
  levels:   { '1-0': {stars: 3, plays: 2}, ... },   // 键 = '章-关'，章号 1 基
  dailyMin: { '2026-09-21': 12 },                    // 每日前台分钟
  settings: { sound: true, tts: true, vol: 0.6 },
  restTip:  { day: '', shown: 0 },                   // 休息提示按日清零
  bonus:    { '2026-09-22': 2 }                      // 家长多玩关数（按日，0-30）
}
```

- **容错**：读取损坏或 `v !== VER` → 重置为默认存档（**不白屏**）；每次 load 刷 lastDay 并立即 persist。
- **清除入口**：家长面板"重置进度"（confirm 二次确认）；另有导出/导入实现跨设备搬家（导入校验版本与款 id，不匹配拒收）。

---

## 3. 游戏接入指南（新款如何接 core）

以 batch40/cbx 为例（batch6/words 同构，仅门禁细节随批次演进）。

**① 目录与五件套**：`batchN/<game>/_src/{head.html, game-data.js, game-core.js, game-main.js, game-verify.js} + build.py + _selftest.py + SPEC-*.md`。

**② core 引入方式**：无 import、无 CDN——build.py 读 `design/core.js` **全文原样**内嵌为第一个 `<script>`；并断言 core 为最新契约版（必须含 `settle()` 与 `queue(parts)`——防旧版混入）。

**③ 初始化**（game-main.js 启动段，非 verify 分支）：

```js
const VERIFY = /[?&]verify=1/.test(location.search);
if (!VERIFY) {
  KIDS.init({ game: 'cbx', title: '冷静工具箱' });   // 存档键 kidsgame_cbx
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  // 找启动后首个未通关 flat 进入；
  // 若 lim>0 且 KIDS.calendar.dayDone(keys) → 直接 KIDS.ui.dayEnd({nextHint})
}
```

`KIDS.init` 内部依次：合并配置 → `store.load()` → `ui.injectCss()` → 绑定 pointerdown `audio.unlock()` → `parent.init()` → `session.start()`。

**④ 常用钩子表**（真实 API 一览）：

| 时机 | 调用 |
|---|---|
| 启动 | `KIDS.init({game, title})` |
| 内容日历 | `KIDS.calendar.limit(totalLevels)` / `dayDone(keysFlat)` / `isNew(flatIdx, total)` / `bonusToday()`；家长侧 `bonusSet(n)` |
| 通关写档 | `KIDS.level.pass(ch, lv, stars, 本章lv数组)` → `{chapterDone}`；读 `KIDS.level.stars(ch, lv)` |
| 仪式 | `KIDS.ui.celebrate(stars)`（Promise）→ `chapterEnd({chapter, stars, nextHint})` / `dayEnd({nextHint})` / `restTip()`（内部触发） |
| 语音 | `KIDS.voice.play(key, text)` / `KIDS.voice.queue([key, {key, text}, ...])` / `KIDS.voice.say(text)`（现=静默） |
| 音效 | `KIDS.audio.sfx('ok'|'win'|'fail'|'click'|'pop'|'coin')` / `KIDS.audio.note(freq, dur, when, vol)` |
| 读档 | `KIDS._save()`（save 活引用）；`KIDS.store.persist()` |
| 素材 | `KIDS.assets.rabbit('normal'|'happy'|'sleepy'|'wave', size)` 小兔子 SVG |

内容日历口径：每日新关基数 `DAILY_NEW=6`，第 2 天起封顶 `DAY_CAP=2`（即首日 6 关、次日起 12 关/日）+ 家长 bonus 0-30；`limit = min(总数, min(dayIndex, 2) × 6 + bonusToday)`。生成关款传 `limit(Infinity)`，"今日完"由 `dayDone(keysFlat)`（前 limit 个 key 全有通关记录）判定。

**⑤ 款侧必须自建**（core 不提供）：

- 确定性引擎：mulberry32 关卡生成 + 无 DOM 判定函数（game-core.js，UI 与 verify 共用同一份）；
- 教学关：首次进入幽灵手指示范（`KIDS._save()` 的款附加字段记 tutSeen）；
- **救援双锚**（家族 B 形态，后期批次）：`setInterval(rescueTick, 1000)`——静置 14s 方向级（重播题面/情境句；`lastDir` 独立节流锚）、30s 答案级（正确项 breathe 动画+重播；重置 `lastAct`）；三让路：演出锁期（`state.showUntil`）、错链豁免窗（`wrongChainUntil`）、面板/结算层在场（契约 B/I/K）；早期款（如 words）为单锚 20s 重读形态；
- `nextHint(flat)`：章末/日末明日预告文案（款侧内容自知，core 只渲染字符串）；
- 验收钩子：`window.<HOOK> = { start(flat), get currentLevel, get quiz, tapPick(i), autoSolve() }`——**真实页同样暴露**（b29 坑⑥：仅 verify 页暴露=驱动假阳性）。

**⑥ 语音键纪律**：新 clip 键前缀先查 `voice/manifest.json` 无占用（b28 撞前缀双事故：先查再用）；新键必须登记进 `gen_clips.py` 的 ALL 列表并重跑合成，否则重跑 gen_clips 会冲掉 manifest 手改。

---

## 4. 构建与语音流水线

### 构建（build.py，以 words 为例）

- **拼接序**：`head.html` + `<script>core.js 全文</script>` + `<script>clips 注入行</script>` + `<script>game-data + game-core + game-main + game-verify</script>` → `../index.html`。
- **硬性检查**（通用）：
  1. 各段禁字面 `</script>`（防提前闭合，需写 `<\/script>`）；
  2. core.js 契约版断言（`settle()` / `queue(parts)` 在场）；
  3. **完全离线**：除 SVG xmlns 命名空间外，禁 `http://`、`https://`、`<link`、` src=`、` href=`；
  4. 款结构锚（words 例：CHARS 恒 55 字、拼音 clip key 全唯一全 ASCII、部件全落 CJK 基本区、引擎函数与 verify 单元在场——防拼错文件/丢段）。
- **幂等**：重跑产物逐字节一致，md5 双跑对账（五门禁之①）。clips 注入行带 `/*CLIPS:<game>*/ ... /*CLIPS-END*/` 标记，重注入整段替换。

### 语音流水线（voice/）

- **合成** `gen_clips.py`：edge-tts `zh-CN-XiaoxiaoNeural`（rate -8% / pitch +18Hz）；**文案直接从各款 game-data.js 正则提取**（零手抄偏差）；产物 `clips/<key>.mp3` + `manifest.json`（key → {text, games}）。
- **中央登记**：ALL 列表登记全部 120 款 id——新款不登记而手改 manifest，重跑 gen_clips 即被冲掉（已两次事故：batch20 quiz 三款漏登 5/8 FATAL、b27 shapecount manifest 回退）。
- **注入** `inject_clips.py`：`clips_js(game)` 生成单行 `KIDS.voice.clips = {key:"data:audio/mpeg;base64,..."}`（clip <800 字节即 FATAL）；build.py 构建期调用；无 build 的老款（pipe）走直改 index.html 模式（标记幂等替换）。
- **Task#46 通道收敛**（2026-09-20）：120 款全部 keyless 点位 clip 化（5517 键）；core `speak()` 删除系统 TTS 回退——残余 keyless 调用静默无声 + console.warn，不再出系统合成音。

---

## 5. 验证体系（五门禁 + 审查试玩）

每款交付口径（ledger.md 定版；**不信执行 agent 自报，全读实际产物**）：

1. **build 幂等**：md5/chars 双跑一致。
2. **VERIFY 双视口**：`?verify=1` 自检页（game-verify.js）在 1280×800 与 800×1180 两视口全绿——覆盖结构完整性（DOM 无 undefined、clips 全注入）、布局（触摸目标 ≥96×96、对比度 ≥3:1、overflowX ≤0）、全静态关审计、错路径、**谱对拍**（mulberry32 种子序列 Python 同构复算，答案独立推导禁读页面真值）。
3. **_selftest.py 主线独立复跑全绿**：相 1 等 verify 页 title 含 VERIFY PASS；相 2 真实页——stub 发声 → 教学链**真实 DOM 点击** → autoSolve 通关 → 存档断言（`kidsgame_<game>` v '1.0'、levels['1-0'].stars=3）→ clips 计数 → pageerror=0。纪律：独立 `chromium.launch(--mute-audio)`，禁 connect/禁杀任何浏览器。
4. **verify_one / batch 腿**：款级真实点击门禁（如 verify_one_shadow 的 19 项：含救援 14s 双通道、错点不重置救援钟、钩子、离线、截图非空白等）+ 新语音键 manifest 中央登记对账。
5. **审查 + 试玩**：core-adversarial-reviewer 反方审查 fatal=0（major 修复后终确认）+ 无头试玩 P0=P1=0 + 修复闭环表全勾。

另有各批 `gate_commonN.py` 首单元门禁（G1 verify/selftest 复跑、G2 真实页通关写档 3 星 + 0 pageerror、G3 clips 注入计数；MUTE_INIT 全 stub 静音双保险——媒体元素、speechSynthesis、Audio.play、AudioContext 全部替换）。

---

## 6. 边界与未实现项（诚实清单）

**core.js 未提供、由款侧家族约定承担**（功能存在但非引擎层公共 API）：

1. **救援提示**：core **无救援模块**。14s 方向级 / 30s 答案级双锚实现在每款 game-main.js（家族 B：`lastDir` 与 `lastAct` 双锚分离防答案级被饿死；错链豁免窗让路=契约 I；面板在场静默=契约 K）。早期款（words 等）为单锚 20s 形态——**非全库统一**，以各款 SPEC 为准。
2. **难度自适应**：无按表现的算法调档（星级不回灌难度）；难度=章谱静态 dch + 救援动态支架，两层都不在 core。
3. **统一 shell 状态机**：无暂停按钮、无款内返回目录、无开始菜单（无菜单直进教学=设计选择）；重开=款侧 replay 按钮约定。
4. **本局步骤/时长 API**：core 只记日级分钟（dailyMin）与关级 stars/plays；本局 step/retries/用时由款侧模型自理。

**任务书八项中的真实缺口（全库未实现）**：

5. **reduce-motion**：`prefers-reduced-motion` 全库 0 处命中——无系统级减动画通道（减感官刺激仅有关音效+静态覆盖层两条）。
6. **键盘操作**：无 keydown 交互路径（Pointer Events 单一输入），不适配纯键盘用户。
7. **屏幕阅读器**：仅零星 aria-label（家长按钮/策略卡），非系统性 SR 支持。
8. **动态文本语音**：系统 TTS 已删（Task#46）——语音只能预合成 clip；运行期动态拼出的无 clip 文本=静默（say/缺 clip 回退均无声+控制台告警）。

**文档时效注**：DESIGN-SPEC §1 的"KIDS.speak(text)（speechSynthesis）"描述已被 Task#46 覆盖；DESIGN-SPEC 为历史契约文档，运行真值以 `design/core.js` 代码为准。
