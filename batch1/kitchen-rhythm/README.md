# 厨房节奏（kitchen-rhythm）— 单文件离线儿童节奏游戏

## r18 难度改造（老结构重建，SPEC-R18-KITCHEN）
本款原为 batch1 老结构（game.js+game.css 单块拼接，无 verify/selftest），r18 按家族主流范式
（batch32/evidence r17 定版）重建为五件套+验证链。难度 delta（AUDIT-56 黄 11 首位）：
- **曲库 10 首**（≥8 达标）：恒速 3（小星星/两只老虎/欢乐颂）+ 变速 3（小蜜蜂/粉刷匠/伦敦桥，
  中途 BPM 换档）+ 长曲 2（铃儿响叮当 32 拍/生日快乐 40 拍）+ 双轨 2（厨房交响/快乐厨师）。
  密度 ≤0.8、相邻拍差 ≥0.5、t 严格递增（verify 逐曲审计）。
- **连击门槛星级**（节奏精度升级）：maxCombo ≥ gate3 → 3 星 / ≥ gate2 → 2 星 / 曲终即 1 星
  （永不 0 星）。gate2=floor(N·[1/3,1/2,2/3,3/4])、gate3=floor(N·[1/2,2/3,3/4,4/5])（dch 档）。
- **判定三档**（BPM 归一化窗）：perfectW=clamp(0.22·beatDur, .09, .15) 秒对称窗（Good=2×），
  变速曲按音符所在段 bpm 逐音归一化；Perfect 金星 / Good 绿勾（形状冗余反馈）。
- **双轨音符**（ch4）：上下两条时间轴（lane0 上轨/lane1 下轨），点按按上下半屏分流，
  每 lane 独立冷却；ch4 双轨首教 kr_dual（左手一下右手一下）。
- **章爬升**：ch1 恒速 → ch2 变速 → ch3 长曲 → ch4 双轨；CH_LEN=8（v1=5，存档迁移 IIFE），
  生成关 flat≥32（mulberry32(flat·7919+1002) 确定性：dch+song 先后消费）。
- **时长模型**（DECIDE_MS 联动）：DECIDE_MIN={恒 550/变 620/长 620/双 800}ms，
  modeled=900+Σmax(gap,DECIDE_MIN)+1800；全 40 关 ∈[17170,27447]ms（LEVEL_MIN_MS=17000），
  modeled 双钉（JS verify+python _selftest 位级一致，禁约数）。

## 玩法（保留框架）
- 食材随轨道滑向判定圈，到圈时刻点击 → 两半飞出 + Perfect 金星/Good 绿勾 + 该拍马林巴音符。
  玩家命中即旋律（漏掉的音符静音，伴 146.83Hz 低闷短音——合成音 note stub 取证通道）。
- 漏掉 = 食材落向小猫被叼走（零惩罚）；连漏每 3 触发错反馈链 kr_missmore（豁免窗 3216+300=3516，
  救援 interval 让路；flat<3 必播、flat≥3 走 10s 节流）。
- 曲终装盘结算（.k-song-end）：刀×命中 + 连击×maxCombo + 猫×叼走 + 星级；播报链全 clip
  （kitchen_cut/n_1..30/kitchen_cat），>30 走 say 兜底。
- 连击 ≥5 小兔子右上角跳舞；自由琴键 8 键马林巴（C5-C6）。
- 首曲教学「看（4 音演示，输入吞+pop）→帮（第 5-8 音幽灵手指）→独（第 9 音起放手）」。

## 语音（voice/clips/manifest.json 对账）
kitchen_* 33 老键沿用 + r18 新键 kr_hint/kr_missmore/kr_dual（gen_clips.py 已登记合成）
+ core_* 3 = 39 条全注入。

## 构建（新结构，老 game.js/game.css 保留于 _src 备查、不参与构建）
- `python _src/build.py`：head.html + design/core.js 全文 + clips 注入（39 条）
  + (game-data.js+game-core.js+game-main.js) + game-verify.js 独立第 4 块 → index.html；
  html.count('<script>')==4；家族契约 A/B/D/E/F/I/J/K/MIG/PORT-CLS/O/离线/estMs 四方
  静态断言全内建；幂等（双跑 md5 一致）。
- `index.html?verify=1`：17 单元全量对账（曲库 SPEC 表逐值/40 关表/判定窗域/连击档/
  双轨分流/secAt 分段积分/教学链/autoRun/miss 音取证/吞输入 bump/双视口布局/clips 时长/
  契约源码断言/estWin/modeled 双钉/hints/SPEED）→ title=VERIFY PASS 17/17。
- `python _src/_selftest.py`：66 项（真实逐音点击通关/教学链/双轨上下半屏/双视口+竖屏通道
  等价/生成关/迁移四例/sayW 三态/救援双锚/完全离线+0 pageerror+0 发声）。
- `_src/_spec_calc.py`：SPEC 复算工具（mulberry32 与 node 位级对照；40 关全表输出）。
