# 决策日志

## #1 2026-09-23 本轮执行策略：文档对齐 + 冒烟复验，不重做改造
- **背景**：收到「成熟儿童游戏」任务书（审计→分级→路线→公共能力→分批实现→测试→复盘）。
- **原因**：该仓库已完成远超任务书要求的工程——120 款全部上线；Task#45 难度改造期 86 款深度改造收官
  （红 40 r1-r14 + 黄 46 r15-r50，每款五门禁 + 独立审查 + headless 试玩三轮验证，见 ledger.md §2）；
  design/core.js 已提供 GameShell/GameSession/反馈/奖励/家长面板/无障碍/LocalStorage 等公共能力等价实现。
  任务书自身约束「不进行无必要的大规模重构」「保持现有技术栈与入口」。
- **影响范围**：本轮只新增 docs/ 文档 + output/smoke-120/ 冒烟报告；游戏源码与构建产物零改动。
- **回滚方式**：删除 docs/ 目录与 output/smoke-120/ 即恢复原状；无代码风险。
- **验证方式**：A6 冒烟（120 款启动无 pageerror）+ 文档内每项断言可指向 ledger.md §2 / difficulty-audit/ 证据。

## #2 2026-09-23 仓库可见性：公开 → 私有
- **原因**：用户明确指令「转为私有，不让任何人看到」。
- **执行**：`gh repo edit frandy820/kids-games --visibility private --accept-visibility-change-consequences`
- **结果**：`{"visibility":"PRIVATE"}` 已验证。进行中的 push 不受影响（owner token）。
- **注意**：.gitignore 维持排除内部账本（ledger.md/difficulty-audit/output 等）不动。

## #3 2026-09-23 评分口径：改造后状态评分，证据锚定
- **原因**：任务书要求 100 分制六维评分（可玩性 25/适龄 20/循环复玩 20/反馈音画 15/操作无障碍 10/稳定可维护 10），
  但 difficulty-audit/ 三份审计为**改造前**评级（红/黄/绿）；直接沿用会把已修复问题误记为现状。
- **裁决**：评分反映**改造后当前状态**；每款须交叉三源——审计行（改造前问题）+ ledger.md §2（改造内容与验证证据）
  + 该款 SPEC/试玩报告（可读时）。无法核实的维度给保守分并在备注注明「推断」。

## #4 2026-09-23 推送通道：代理 HTTPS 弃用 → SSH ssh.github.com:443 直连
- **背景**：188M pack 大推送。代理 HTTPS（V2Ray 10809）两连败——①CC 后台任务被系统低内存收割；②独立进程重推后 V2Ray 断流，
  git-remote-https 挂死（TCP 只剩 Bound 残壳、CPU 零增长，「进程活着但集体不动」）。
- **处置**：杀卡死进程树（精确 PID，避开兄弟会话 optcg 推送）→ 生成专用 key `C:/Users/mod/.ssh/kg_push_key`
  → 注册 **repo 级 deploy key**（kids-games-push，可写，不动账号全局 key）→ `git remote set-url origin ssh://git.github.com:443/...`
  → Start-Process cmd 独立进程推送（脱离 CC 会话收割）。
- **结果**：一次成功，188M 约 14 分钟（显著快于代理）。后续推送沿用此通道。
- **回滚**：`git remote set-url origin https://github.com/frandy820/kids-games.git` + gh api 删除 deploy key。

## #5 2026-09-24 仓库可见性：私有 → 公开 + 开通 GitHub Pages
- **原因**：用户指令「发布到 GitHub 上，公开任何人都可以，平板上试一下」——推翻 #2 的私有决定（用户在两个时点的不同指令，以最新为准）。
- **执行**：`gh repo edit --visibility public`（验证 PUBLIC）+ 开 Pages（source=main 根目录，build_type=legacy）。
- **结果**：站点 https://frandy820.github.io/kids-games/ 构建 built，主入口+游戏页抽查 200。平板/手机浏览器可直接玩，全静态离线结构在 Pages 上等价本地 file:// 行为。
- **注意**：仓库含 docs/ 内部路径（F:/claudecode/...）与工作文档，随公开一并可见——用户已知情并明确要求公开。ledger/difficulty-audit/output 仍按 .gitignore 不入库。
- **验证**：首推后 gh api 核验 commits=2；后续收官增量推送（7a3f2cc）后复核 commits=3。进程干净退出 + 日志 `* [new branch] main -> main`。

## #6 2026-09-27 S4 收尾：11 款「自持构建款」不迁移 build_lib，三态分界定版——**用户过目待确认**
- **背景**：S4 引擎抽取收官（b1-b11，commit 954f785），110/121 款已薄壳化（_src/build.py =
  design/build_lib.py 薄壳）；11 款未迁移，此前散见台账但零正式落盘（S4 反方审查 M4 敞口）。
- **术语（定版）**：这 11 款称**「自持构建款」**——各自持有独立 build.py（或纯手拼），
  不依赖 design/build_lib.py。旧称「legacy 款」废止（与 `batch2/memory/build_legacy/`
  旧结构备份目录双义撞名，审查 m5）；该备份目录名不变（r19 归档，不参与构建），与本决策无关。
- **11 款清单与形态**：
  | 款 | 形态 | 说明 |
  |---|---|---|
  | batch2/color | 款根 build.py，1 块拼接（template 直填） | _src 仅 game.css/game.js/pics.js 三件 |
  | batch2/tangram | 款根 build.py，head+body 三块 | ROOT 指向 _src |
  | batch3/math | 款根 build.py，五件套三块（verify 并入） | 与薄壳同素材、不同骨架 |
  | batch3/pattern | 款根 build.py，head+body 三块 | |
  | batch3/pinyin | **_src/**build.py，head+body 非五件套（merged-in-main 变体） | 薄壳化需先做源件拆分适配 |
  | batch4/clock | 款根 build.py，五件套三块 | |
  | batch4/sudoku | 款根 build.py，head+body 三块；路径本就相对 | |
  | batch4/times | 款根 build.py，五件套三块；路径本就相对 | |
  | batch5/connect | 款根 build.py，五件套三块 | |
  | batch1/pipe-rabbit | **无 build.py**（纯手拼 index.html） | 初代款 |
  | batch1/shop-math | build/build.py（build/ 目录变体） | 拼接源在 build/ 内 |
- **不迁移理由**：①改造收益低——薄壳化对前 8 款=先补齐 _src 拆分/五件套适配工程
  （pinyin 非五件套、color 三件、tangram/pattern/sudoku 有 body.html），纯重构无产物收益
  （S4 红线：产物逐字节不变）；②pipe-rabbit/shop-math 无标准构建链可接；③11 款均有
  smoke+md5 对照保护（终验 121/121 PASS，自持款为对照组原样未动）；④S4p3 判定
  「0.8% 收益不称 118 款重排成本」同向。
- **三态分界（family.css 视角，与 design/family.css 头注释一致）**：
  ①**占位款**（薄壳 110 中 head 含 FAMILY_CSS 占位者，109 款——kitchen-rhythm 薄壳但
  head 本无三段）——family.css 改段波及其产物；②**跳段款**（占位款子集 37 款：ghost
  跳段 20 + verify 跳段 17）——该段改动不波及；③**自持构建款 11**——不读 family.css，
  同功能段自持且本就异形（实证：color 的 verify 段为单行简版 `#verify-result { display: none; }`
  vs family.css 四行段），「与 family.css 对拍一致」对它们永不成立。
- **配套护栏（本条同批落地）**：design/check_family_drift.py 三态快照 + 基线
  design/family-drift-baseline.json（自持款异形段指纹入册，改段前后对账）；
  8 个含 F:/ 绝对路径的自持款 build.py 已收编 pathlib 相对推导（color/tangram/math/
  pattern/pinyin/clock/connect/shop-math；sudoku/times 原本相对；pipe-rabbit 无脚本），
  逐款 rebuild 对拍 md5 与改前逐字节相等（8/8，产物 git 零 diff）。
- **回滚方式**：`git revert` 本条对应 commit 即恢复绝对路径版；决策本身如用户否决，
  按用户指令启动对应款的薄壳化迁移（b1-b11 滚动口径可复用）。
- **验证方式**：mutation test 18/18（含自持款口径外的薄壳全批代表）+ drift 基线对账
  PASS + 自持款 8/8 rebuild 对拍；**本条目用户过目确认前为「待确认」状态，不视为已销项**
  （S4 审查 M4-①：用户过目动作由 orchestrator 向用户确认后销项）。
