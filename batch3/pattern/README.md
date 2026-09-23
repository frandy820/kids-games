# 规律侦探 pattern（batch3 第三款）

单文件离线 HTML5 游戏，6-7 岁儿童向。看图案序列找规律，从 3 个大按钮里点出缺失的下一张/中间一张。

## 玩法
- 图案序列 5-8 张可见 + 1 张问号卡（缺失在末尾或中间）；答对 = 问号卡 3D 翻开 + 序列从头逐张弹跳回放（五声音阶随行，强化规律感）
- 答错 = 按钮 3D 晃 + 灰掉 + 正确项高亮 1.2s（支架），停留本题零惩罚可重点；同题连错 2 次幽灵手指常驻救援
- 星级：全对 3 星；总重试 ≤3 = 2 星；否则 1 星（永不 0 星）
- 图案池 12 种 = 6 形状 × 6 颜色（每形状恰 2 色、每色恰 2 形状，SVG 程序合成，2.5px 暖棕描边）
- 章节难度（r27 上探谱，详见 `_src/SPEC-R27-PATTERN.md`）：章1 周期单元≥3（ABC/ABCD/ABBC）+双维入门（AB/ABB 仅教学链+flat0 坡度，生成关亦不回混——审查M1 r27 修）→ 章2 中间缺失（双侧推断）+复杂单元 → 章3 双维度（2/2 → 章末 dualP 双轴独立周期 2×3）→ 章4 数量规律 + 形状×数量复合（compound，干扰项=半对双错项）
- 无限生成：静态 20 关（4 章×5）+ flat≥20 按主题循环生成（进阶周期→中间缺失→双维度→数量+复合），种子 mulberry32(flat*7919+13)，同 flat 永远同关；规律一律写成显式纯函数 ruleAt(rule,i)（五族 cycle/dual/dualP/count/compound，任意位置可程序推断，缺失项=ruleAt(missingIdx)，干扰项=同池规律外且 ≠answer）
- **图标预算铁律**：每关去重图标需求前缀和 ≤12（池 12 枚整级去重借出），verify 谱对账单元同检——改谱先核预算
- 教学：仅关 1-0 首次（看=自动答+回放 → 帮=高亮序列前段+幽灵手指 → 独=放手），存档字段 `pat.tutSeen`（教学演示题=flat0 首题 AB_END，逐字节锚不动）
- 20 秒无操作轻声提示目标；语音仅前 3 关（flat<3）

## 构建
```
cd batch3/pattern && python build.py   # _src/head+body + core.js(全文原样) + clips + data+core+main → index.html
```
断言：core 含 settle()/queue(parts)；无字面 `</script>`；无 http(s)/外链；r27 结构锚（dualP/compound 在引擎、SPEC_T27 在 verify、退役模板 AABB_END/AB_MID 不残留）。pattern clips 未生成时自动降级空串，主会话注入语音后重建即可。

## 验收
- `index.html?verify=1` → 40 关（静态 20+生成 20）规律程序校验（五族轴校验+每题几何模板对账）+ 引擎 autoSolve 全通关 + 星级/错选单元 + r27 谱对账/新形态单元 + UI 路径 autoSolve + 布局抽查，title=`VERIFY PASS 45/45`，JSON 在 `#verify-result`
- `_selftest.py`（headless playwright，独立 chromium.launch()，MUTE 静音双保险）：verify / 预置存档真实点击通关 .k-celebrate / 教学链路（看→帮→独） / 错选零惩罚 / r27 新形态实测（flat14 dualP + flat17 compound 真实通关写档） / 双 viewport 布局 / 截图非空白
- `_r27_pycheck.py`：Python 独立复算 40 关 quizzes 与页内 JS 逐字节一致（双侧 verify）+ 保留基线六关对照

## 验收钩子
`window.PAT = { currentLevel{flat,ch,lv,qi,misses,won}, quiz(){seq,items,answer,missingIdx,answerIdx,kind,tk,len}, pick(i), autoSolve(), start(f), tutorial }`（seq 缺失位为 null；kind/tk=r27 规律族与题型锚）

## 已知限制
- 生成关（flat≥20）主题循环，难度不再新升（材料/缺失位仍随种子变化）
- 数量卡最多 9 个小图案；8 卡序列在竖屏 800px 宽实测 83px 卡（>64 下限）；更窄视口（宽 <520px）8 卡会逼近 64px 下限
- r27 改造范围与保留基线证据：`_src/SPEC-R27-PATTERN.md` §R6（flats 10-13/15-16 逐字节不动）
