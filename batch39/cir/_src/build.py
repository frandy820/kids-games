# -*- coding: utf-8 -*-
"""cir 电路小灯泡 r4 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch39/cir/_src/build.py
布局（b36 M1 强制项，三款断言对称）：script[0]=core / script[1]=clips / script[2]=纯
data+engine+main（无 verify 字面）/ script[3]=verify 独立第 4 块——verify ⑨ 源码断言读
script[2] 恢复判别力。
纪律：断言消息一律 f-string/拼接——py 百分号格式串禁用在含 JS 源文本的串上
（JS 注释含裸百分号字符——b38 坑带入）。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch39/cir/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（cir_ 11 条 + core_* 3 条，manifest 对账——r4 增 2 键+T46 阶段2 观察句 +4）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('cir') 全量返回（manifest games 已含 cir 的
# core_* 3 条自动带上）——本脚本不写任何手工 core 补注入循环，
# 并以计数断言防双注入（若日后需补注入必须幂等跳过：键已在则 continue）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('cir')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：cir_ 11 条 + core 3 条 = 14 条（SPEC-BATCH39 §3 r4 +2；T46 阶段2 cir_obs_1..4 +4）
CIR_KEYS = ['cir_tut_watch', 'cir_tut_turn', 'cir_hint', 'cir_right', 'cir_wrong',
            'cir_pred_wrong', 'cir_bright_wrong',
            'cir_obs_1', 'cir_obs_2', 'cir_obs_3', 'cir_obs_4']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CIR_KEYS + CORE_KEYS:
    assert f'"{k}"' in clips, f'clips 缺少 {k}'
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 14, f'clips 条数 {n_clips} != 14（cir 11 + core 3）'
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count(f'"{k}"') == 1, f'core 键 {k} 双注入（幂等跳过缺失）'
# 注入键前缀对账：只允许 cir_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('cir_') or k in CORE_KEYS for k in _inj_keys), \
    f'clips 出现非 cir_/core_ 键: {sorted(set(k for k in _inj_keys if not (k.startswith("cir_") or k in CORE_KEYS)))}'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'cir'" in main, 'main 缺 KIDS.init cir（存档键 kidsgame_cir）'
assert 'window.CIR =' in main, 'main 缺 CIR 钩子'
assert '__cirDemoR' in main, 'main 缺教学演示实证 __cirDemoR'
assert '__cirDemoPredR' in main, 'main 缺教学预判步实证 __cirDemoPredR（r4 双答演示）'
assert '__cirTutSolo' in main, 'main 缺教学帮→独实证 __cirTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非板子进度）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本款常量锚（SPEC-BATCH39 §0.96/§3 r4：生成关 dch=ri(rnd,1,4)，mulberry32(flat*7919+877)——seed 877）
assert 'flat * 7919 + 877' in engine, 'engine 缺本款常量 seed 877（SPEC §0.96）'
assert 'ri(rnd, 1, 4)' in engine, 'engine 缺生成关 dch 策略 ri(rnd,1,4)（b33 硬性②显式声明）'
# 回路律字面（SPEC §0.96 数学锚——verify 独立复算依据：闭合=全槽有件→全槽 on）
assert 'q.slots[s].on = true' in engine, 'engine 缺回路律全槽通电字面（SPEC §0.96）'
# r4 双答制引擎锚：阶段1 预判引擎+顺序守卫+四题型真值律
assert 'function engTapPred(L, d)' in engine, 'engine 缺阶段1 预判引擎 engTapPred（r4 双答制）'
assert 'function predAnsOf(row)' in engine, 'engine 缺四题型真值律 predAnsOf（SPEC §3 r4）'
assert 'q._answered || !q._predOk) return null' in engine, 'engine 缺双答顺序守卫字面（r4 delta 1）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, f'启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 {main.count("nextHint(lim - 1)")}'
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.cir.tutSeen）
assert 'sv.cir && sv.cir.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁章序右移——检索串拼接防自匹配）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟三链常量）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 4266' in data, 'data 缺元件错链豁免窗常量 4266（SPEC §3 r4）'
assert 'const PRED_CHAIN_WIN = 5490' in data, 'data 缺预判错链豁免窗常量 5490（r4）'
assert 'const BRIGHT_CHAIN_WIN = 4962' in data, 'data 缺亮度错链豁免窗常量 4962（r4）'
assert 'wrongChainUntil = Date.now() + chainWin' in main, 'main 缺错反馈链豁免窗赋值（契约 I 三链）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺元件链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J 配套）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && d !== q.predAns' in main, \
    'main 缺预判豁免窗 guard（I 补：错答吞/对答放行——r4 阶段1）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）；flat<3（含教学 -1）每错必播
# ——写法恒 cur.flat < 3（b36 m3+b37 R1 两起教训）
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播分支（契约 J 写法恒 cur.flat < 3）'
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §3 r4 本款特化：双答制（预判行 answerbar+phase 视觉态+顺序守卫 UI）+ 断/短分型
# （litGapEnds 不泄答案/traceMain 主路流光/fraymark 断口毛边/jumper 红纹跨接）+
# 题面句 keyless say + 落位灯亮 powerOn + 悬停预览虚影（非判定层）+ 拆线卡
assert 'function litGapEnds(q)' in main, 'main 缺方向级缺口触点高亮 litGapEnds（SPEC §3 不泄答案）'
assert 'function traceMain()' in main, 'main 缺阶段1 主路流光 traceMain（r4 拓扑方向级）'
assert 'function renderAnswerbar(q)' in main, 'main 缺预判行渲染 renderAnswerbar（r4 双答制）'
assert 'function renderPhase(q)' in main, 'main 缺阶段视觉态 renderPhase（r4 顺序引导）'
assert 'function removeJumper()' in main, 'main 缺拆线演出 removeJumper（r4 fault-F3）'
assert 'KIDS.voice.play(q.obsKey, q.obs)' in main, 'main 缺题面句 clip 播报（T46 阶段2 cir_obs_ 章档键）'
assert "classList.add('closed', 'pop')" in main, 'main 缺导线落位 closed 落位（SPEC §3）'
assert 'powerOn(q)' in main, 'main 缺落位瞬间灯亮+环流 powerOn（SPEC §0.96 即时因果）'
assert 'setPreview(q, p.dataset.size)' in main, 'main 缺悬停预览虚影 setPreview（SPEC §3 先猜后试）'
assert 'function cutSvg' in data, 'data 缺拆线卡 SVG（r4 fault-F3 元件）'
assert 'function predIconSvg' in data, 'data 缺预判按钮图标（r4 answerbar）'
assert 'id="answerbar"' in head, 'head 缺预判行 #answerbar（r4 判定层阶段1）'
assert '#picks.dim' in head, 'head 缺元件库 dim 顺序引导样式（r4 双答制）'
# SPEC §3 r4 演出时序常量：判对窗 1400+1600 / 全板通电窗 2400 / 三错链 4266·5490·4962
# / 三首错锁 1998·3222·2694 / 钉住 500 / 真相窗 1800 / 拆线 1000 / 兔子 700
for frag in ('const LIT_MS = 1400, FLOW_MS = 1600', 'const FULL_WIN = 2400',
             'const WRONG_CHAIN_WIN = 4266', 'const WRONG_LOCK_1 = 1998',
             'const PRED_CHAIN_WIN = 5490', 'const PRED_LOCK_1 = 3222',
             'const BRIGHT_CHAIN_WIN = 4962', 'const BRIGHT_LOCK_1 = 2694',
             'const PRED_OK_MS = 500', 'const REVEAL_MS = 1800',
             'const CUT_MS = 1000', 'const BUNNY_MS = 700',
             'const SPAN = { S: 56, M: 84, L: 112 }'):
    assert frag in data, f'data 缺 SPEC §3 r4 演出常量 {frag}'
assert 'lastReplayAt < 3000' in main, 'main 缺重听 3s 节流'
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapPred/tapPart 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapPred/tapPart 演出期 null）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素。本款题面句走 voice.play 章档键（T46 阶段2 clip 化，
# 承 b36/b37/b38 N 括注防误伤），确认链 ['cir_right'] 单 clip——main/verify 若出现
# { key: null } 段仍须居链尾（本款预期零处，循环零次通过）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            f'game-{_src_name} keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：{_tail[:6]!r}'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH39 §3 r4 实长表）=====
def est_ms(n):
    return n * 345 + 600
CIR_WATCH, CIR_TURN = 2856, 1824                  # cir_tut_watch / cir_tut_turn 实长
CIR_HINT, CIR_RIGHT, CIR_WRONG = 1968, 1968, 1848  # hint 1968 / right 1968 / wrong 1848
CIR_PRED_WRONG, CIR_BRIGHT_WRONG = 3072, 2544      # r4 新增：pred_wrong 3072 / bright_wrong 2544
# ① 确认链（判对单 clip cir_right）→ 演出窗 1400+1600=3000 ≥ 1968+300=2268（SPEC §3 r4）
assert 'LIT_MS * SPEED' in main and 'FLOW_MS * SPEED' in main, 'main 缺判对演出窗 1400+1600（家族 G/H）'
assert 1400 + 1600 >= CIR_RIGHT + 300, \
    f'判对演出窗 3000 < 确认链 {CIR_RIGHT + 300}'
assert 1000 + 1600 >= CIR_RIGHT + 300, \
    f'F3 拆线窗 2600 < 确认链 {CIR_RIGHT + 300}'
# ② 错反馈链豁免窗（契约 I·三链）：元件 4266 / 预判 5490 / 亮度 4962（SPEC §3 r4 精确值）
assert 4266 == CIR_WRONG + 150 + CIR_HINT + 300, f'元件链豁免窗 4266 != 错链 {CIR_WRONG}+150+{CIR_HINT}+300'
assert 5490 == CIR_PRED_WRONG + 150 + CIR_HINT + 300, f'预判链豁免窗 5490 != {CIR_PRED_WRONG}+150+{CIR_HINT}+300'
assert 4962 == CIR_BRIGHT_WRONG + 150 + CIR_HINT + 300, f'亮度链豁免窗 4962 != {CIR_BRIGHT_WRONG}+150+{CIR_HINT}+300'
# 三首错锁收窄（b37 R3+b38 R1 总窗口径：锁=clip+150 顶格 ≤ 豁免窗——锁后段留
# 「对选放行」活跃段；锁表达式禁叠尾窗常数）
assert 1998 == CIR_WRONG + 150, f'元件首错锁 1998 != wrong {CIR_WRONG}+150'
assert 3222 == CIR_PRED_WRONG + 150, f'预判首错锁 3222 != {CIR_PRED_WRONG}+150'
assert 2694 == CIR_BRIGHT_WRONG + 150, f'亮度首错锁 2694 != {CIR_BRIGHT_WRONG}+150'
assert '(q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED' in main, \
    'main 缺元件错链主窗三元（b37 R3 首错 1998 收窄 / miss≥2 防重入 1000）'
assert 'const lock = q._miss === 1 ? lock1 : WRONG_LOCK_2;' in main, \
    'main 缺预判/亮度错链主窗三元（r4 三链分档 lock1）'
# b38 R1 总窗口径（审查 M1）：锁表达式禁叠尾窗常数——SPEED=1 实锁须=clip+150 顶格
for _bad in ('(q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED + 140',
             'WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED + 140',
             'PRED_LOCK_1 : WRONG_LOCK_2) * SPEED + 140',
             'BRIGHT_LOCK_1 : WRONG_LOCK_2) * SPEED + 140'):
    assert _bad not in main, f'首错锁叠尾窗（{_bad[:34]}…越界——b38 审查 M1 同型）'
# ③ 题面句窗（家族 T：estMs(全字符)+300——ch1 十字句 4350 / ch2 九字句 4005 /
# ch3 十一字句 4695 / ch4 十字句 4350）
assert est_ms(9) + 300 == 4005 and est_ms(10) + 300 == 4350 and est_ms(11) + 300 == 4695
assert '接好这一根，灯会亮吗' in data and len('接好这一根，灯会亮吗') == 10, 'ch1 题面句须 10 字（窗 4350=estMs(10)+300）'
assert '闭合开关，灯会亮吗' in data and len('闭合开关，灯会亮吗') == 9, 'ch2 题面句须 9 字（窗 4005）'
assert '修好闭合开关，灯会亮吗' in data and len('修好闭合开关，灯会亮吗') == 11, 'ch3 题面句须 11 字（窗 4695）'
assert '两盏灯会比一盏更亮吗' in data and len('两盏灯会比一盏更亮吗') == 10, 'ch4 题面句须 10 字（窗 4350）'
assert 'obsWin: 4350' in data and 'obsWin: 4005' in data and 'obsWin: 4695' in data, \
    'data 缺题面句窗常量 4350/4005/4695（家族 T）'
# ③b 关末全板通电窗（FULL_WIN=2400 ≥ cir_right 1968+300——纯演出层罩 winFlow 重播）
assert 2400 >= CIR_RIGHT + 300, f'全板通电窗 2400 < {CIR_RIGHT + 300}'
assert 'FULL_WIN * SPEED' in main, 'main 缺关末全板通电窗驱动'
# ④ 教学演示延窗（watch 2856+300=3156 / turn 1824+300=2124 防尾截）
assert 'await wait(3156 * SPEED)' in main, 'main 缺教学 watch 延 3156（cir_tut_watch 2856+300）'
assert 'await wait(2124 * SPEED)' in main, 'main 缺教学 turn 延 2124（cir_tut_turn 1824+300）'
assert 3156 >= CIR_WATCH + 300 and 2124 >= CIR_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（cir_right 1968）'
assert 2620 + 400 >= CIR_RIGHT + 300, f'celebrate 2620+400=3020 < cir_right 1968+300=2268'
# ⑤ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑥ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '__lastSayText' in verif, 'verify 缺 estMs/__lastSayText 动态断言'
assert 'specTable' in verif, 'verify 缺 SPEC 20 题表独立双录素材（specTable）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/渲染/演出三层）=====
for lit in ('dataset.k', 'data-anim', "classList.contains('on')", 'dataset.part',
            '__cirVlog', 'data-bridge', 'dataset.frayed'):
    assert lit in verif, f'verify 缺帧内容断言素材 {lit!r}（契约 M）'
assert 'data-anim="wire"' in data, 'game-data 导线 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-anim="flow"' in main, 'main 环流层缺 data-anim 锚（契约 M）'
assert 'data-anim="short"' in data, 'game-data 跨接线缺 data-anim 锚（r4 断/短分型）'
assert 'data-anim="cut"' in data, 'game-data 拆线卡缺 data-anim 锚（r4 fault-F3）'
assert 'data-anim="sw"' in data, 'game-data 开关缺 data-anim 锚（r4 开关因果）'
assert "querySelector('.slotg[data-k=" in main, 'main 缺槽位相位选择器（契约 M）'
assert 'boardEl.dataset.n' in main, 'main 缺电路板槽数 DOM 锚（契约 M 渲染即引擎）'

# ===== b36 M1 强制项：verify 独立第 4 script 块 + verify ⑨ 读 script[2] 素材在场 =====
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面'

# ===== 教学链 watch 预算分账（≤16s，单步演示款口径——SPEC §3 r4 验算 13386 名义+演示窗罩确认链）=====
# tutorialWatch watch 段名义分账：watch 延 3156（≥2856+300）+ 开题题面句窗 4350
# （=estMs(10)+300）+ ghost①移入 800 + press 320 + 预判 'ok' 窗 PRED_OK_MS 500+140
# + ghost②移入 800 + press 320 + demo 演出窗 1400+1600（罩确认链 cir_right 2268）
# = 13386 ≤ 16000（r4 双答两步演示——ghost 先指预判按钮再指正确导线）
TUT_SUM = 3156 + 4350 + 800 + 320 + 500 + 140 + 800 + 320 + 1400 + 1600
assert TUT_SUM <= 16000, f'教学 watch 分账 {TUT_SUM}ms > 16000'
for lit in ['3156 * SPEED', 'obsWin * SPEED', '800 * SPEED', '320 * SPEED',
            'PRED_OK_MS * SPEED + 140', 'LIT_MS * SPEED', 'FLOW_MS * SPEED']:
    assert lit in main, f'main 教学分账缺常量窗 {lit}（预算 {TUT_SUM} 断言依据）'

# ===== 单关净时长名义分账（r4 硬指标 ≥50s 结构保证——SPEC §3 r4 分账表）=====
# 每题名义窗=题面句 4005-4695 + 钉住 640 + 判对演出 3000（ch2 另有合开关真相窗 1800）
# 取最薄章 ch1：5×(4350+640+3000)=39950 + FULL_WIN 2400 + celebrate 3020 = 45370
# + 每题 2 决策点（预判+选件）×5=10 决策/关思考时间（v1 为 5）——双答制顺序守卫
# 结构性保证思考占比（verify ⑤ 断言阶段1 未答点元件=null）
NOMINAL_THIN = 5 * (4350 + 640 + 3000) + 2400 + 3020
assert NOMINAL_THIN >= 45000, f'最薄章名义演出窗 {NOMINAL_THIN} < 45000（r4 时长硬指标结构保证）'

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>电路小灯泡</title>' in head, 'head 缺标题 电路小灯泡'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print(f'estMs check: confirm chain {CIR_RIGHT}+300={CIR_RIGHT + 300} <= 3000 lit-win (F3 cut-win 2600); '
      f'wrong-chains 4266/5490/4962 (exact); first-wrong-locks 1998/3222/2694 (b37 R3+b38 R1); '
      f'obs-win 4350/4005/4695/4350; tut-budget {TUT_SUM}ms <= 16000; nominal-thin {NOMINAL_THIN}ms >= 45000')
