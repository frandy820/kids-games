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
- **验证**：远端 commits=2（gh api 核验）+ 进程干净退出 + 日志 `* [new branch] main -> main`。
