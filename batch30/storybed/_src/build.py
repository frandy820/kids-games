# -*- coding: utf-8 -*-
"""storybed 晚安故事序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch30/storybed/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch30/storybed/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
SPEC = pathlib.Path(r'F:/claudecode/projects/active/kids-games/batch30/SPEC-BATCH30.md')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# ===== python 侧独立复算 1：流程封闭 6×4 步（正则提 SPEC-BATCH30 §0.74 表——禁手抄，双录对账） =====
spec_text = SPEC.read_text(encoding='utf-8')
line74 = [l for l in spec_text.split('\n') if l.startswith('74.')]
assert line74, 'SPEC-BATCH30 未找到 §0.74 行'
SPEC_FLOWS = {}
for fid, fname, steps in re.findall(r'(\w+) ([\u4e00-\u9fa5]+)=((?:[\u4e00-\u9fa5]+→)+[\u4e00-\u9fa5]+)', line74[0]):
    SPEC_FLOWS[fid] = {'name': fname, 'steps': steps.split('→')}
assert len(SPEC_FLOWS) == 6, 'SPEC 流程数 %d != 6：%s' % (len(SPEC_FLOWS), list(SPEC_FLOWS))
for fid, info in SPEC_FLOWS.items():
    assert len(info['steps']) == 4, 'SPEC 流程 %s 步数 %d != 4' % (fid, len(info['steps']))
# game-data FLOWS 反提（与 SPEC 双录对账：流程序+名称+24 步文本逐字）
mflows = re.search(r'const FLOWS = \{(.*?)\n\};', data, re.S)
assert mflows, 'game-data 缺 FLOWS 表'
got_flows = {}
for fid, fname, body in re.findall(r"(\w+): \{ name: '([^']+)', steps: \[(.*?)\]\s*\}", mflows.group(1), re.S):
    got_flows[fid] = {'name': fname, 'steps': re.findall(r"t: '([^']+)'", body)}
assert list(got_flows) == list(SPEC_FLOWS), '流程序不符：%s vs %s' % (list(got_flows), list(SPEC_FLOWS))
for fid in SPEC_FLOWS:
    assert got_flows[fid]['name'] == SPEC_FLOWS[fid]['name'], '流程 %s 名称不符' % fid
    assert got_flows[fid]['steps'] == SPEC_FLOWS[fid]['steps'], \
        '流程 %s 步骤表与 SPEC 不符：%s vs %s' % (fid, got_flows[fid]['steps'], SPEC_FLOWS[fid]['steps'])
assert sum(len(v['steps']) for v in got_flows.values()) == 24, '总步数 != 24'
# 步音 key 全量在场（stb_s_<flow>_<n> 由 stepKey 派生——key 函数与 manifest 前缀对齐）
assert "const stepKey = (flow, n) => 'stb_s_' + flow + '_' + n" in data, 'game-data 缺 stepKey 派生'

# ===== python 侧独立复算 1b：SPEC §6 r10 块对账（依赖表/条件步/缺步/认知模型——禁手抄，双录对账） =====
sec6 = spec_text.split('## §6 storybed r10 难度改造定版', 1)
assert len(sec6) == 2, 'SPEC-BATCH30 未找到 §6 r10 改造块'
sec6 = sec6[1]
# §6.1 依赖表：逐流程行提取「步骤(n)无前置 / 步骤(n)前置{a,b} / 全序 0→1→2→3」
m61 = re.search(r'### §6\.1 依赖表 DEPS(.*?)### §6\.2', sec6, re.S)
assert m61, 'SPEC §6.1 未定位'
SPEC_DEPS = {}
for line in m61.group(1).split('\n'):
    lm = re.match(r'- (\w+) [一-龥]+：(.*)', line.strip())
    if not lm:
        continue
    fid, body = lm.group(1), lm.group(2)
    dep = {}
    if '全序' in body:
        seqd = re.search(r'全序 (\d(?:→\d)+)', body)
        assert seqd, 'SPEC §6.1 %s 全序行无链' % fid
        chain = [int(x) for x in seqd.group(1).split('→')]
        for i, n in enumerate(chain):
            dep[n] = [] if i == 0 else [chain[i - 1]]
    else:
        for seg in re.findall(r'[一-龥]{1,4}\((\d)\)(无前置|前置\{(\d+(?:,\d+)*)\})', body):
            n, kind, pre = seg
            dep[int(n)] = [] if kind == '无前置' else [int(x) for x in pre.split(',')]
    assert len(dep) == 4, 'SPEC §6.1 %s 依赖数 %d != 4' % (fid, len(dep))
    SPEC_DEPS[fid] = dep
assert set(SPEC_DEPS) == set(SPEC_FLOWS), '§6.1 流程集不符：%s' % list(SPEC_DEPS)
# game-data DEPS 反提（与 SPEC 双录对账：前置集逐条）
md = re.search(r'const DEPS = \{(.*?)\n\};', data, re.S)
assert md, 'game-data 缺 DEPS 表'
got_deps = {}
for fid, body in re.findall(r'(\w+):\s*\{(.*?)\}', md.group(1)):
    d = {}
    for n, pre in re.findall(r'(\d):\s*\[([\d, ]*)\]', body):
        d[int(n)] = [int(x) for x in pre.replace(' ', '').split(',')] if pre else []
    got_deps[fid] = d
assert set(got_deps) == set(SPEC_DEPS), 'DEPS 流程集不符：%s' % list(got_deps)
for fid in SPEC_DEPS:
    assert got_deps[fid] == SPEC_DEPS[fid], 'DEPS %s 与 SPEC §6.1 不符：%s vs %s' % (fid, got_deps[fid], SPEC_DEPS[fid])
# §6.2 条件步：带小伞(4)前置{0}；出门玩(3)前置扩{1,2,4}；其余同 out
m62 = re.search(r'带小伞\(4\)前置\{0\}.*?出门玩\(3\)前置扩\{1,2,4\}', sec6, re.S)
assert m62, 'SPEC §6.2 条件步依赖文字未定位'
assert "const RAIN_DEPS = {\n  0: [], 1: [0], 2: [0], 4: [0], 3: [1, 2, 4]\n};" in data, \
    'game-data RAIN_DEPS 与 SPEC §6.2 不符'
assert "text: '带小伞'" in data and "'带小伞':" in data, 'game-data 缺条件步文本/小图'
# §6.3 缺步：4 候选=真值+3 干扰；缺口位 0-3
assert '4 候选卡=缺失步真值+3 干扰' in sec6 and 'gapIdx=seeded 0-3' in sec6, 'SPEC §6.3 缺步文字未定位'
# §6.5 认知模型数字表（verify 独立副本一致性由 verify 页内断言承担，此处对账 game-data COG 字面）
COG_SPEC = dict(re.findall(r'- (baseStep|swapPair|distract|condRead|missScan|missInfer|missCand) (\d+)', sec6))
assert len(COG_SPEC) == 7, 'SPEC §6.5 COG 表 7 键实得 %d' % len(COG_SPEC)
mco = re.search(r'const COG = \{(.*?)\};', data, re.S)
assert mco, 'game-data 缺 COG 表'
COG_JS = dict((k, int(v)) for k, v in re.findall(r'(\w+):\s*(\d+)', mco.group(1)))
assert COG_JS == dict((k, int(v)) for k, v in COG_SPEC.items()), 'COG 与 SPEC §6.5 不符：%s vs %s' % (COG_JS, COG_SPEC)
# 40s 门禁+认知>动画字面在场
assert '≥40000ms' in sec6 and '>该关动画基线' in sec6, 'SPEC §6.5 门禁文字缺失'

# 语音 clips 注入（stb_ 37 条（31+r10 新 3+T46 阶段2 三句族 3）+ core_* 3 条，manifest games 已含 storybed）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
STB_KEYS = ['stb_tut_watch', 'stb_tut_turn', 'stb_hint', 'stb_right', 'stb_wrong', 'stb_q', 'stb_next',
            'stb_q_rain', 'stb_q_miss',   # r10：rain/miss 分型题面
            'stb_g_wrong', 'stb_g_distract', 'stb_g_miss']   # T46 阶段2：三句族语义句 clip 化
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('storybed')        # stb_ 34 + core_ 3 = 37 条（SPEC §6.6：31+r10 新 3 + core 3）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
for k in STB_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for fid in SPEC_FLOWS:
    for n in range(4):
        assert '"stb_s_%s_%d"' % (fid, n) in clips, 'clips 缺少步音 stb_s_%s_%d' % (fid, n)
assert '"stb_s_out_4"' in clips, 'clips 缺少条件步音 stb_s_out_4（r10）'
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 40, 'clips 条数 %d != 40（stb 37 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'
assert "const VER = '1.0'" in core, "core.js VER 非 '1.0'（家族 C 存档版本）"

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'storybed'" in main, 'main 缺 KIDS.init storybed（存档键 kidsgame_storybed）'
assert 'window.SB =' in main, 'main 缺 SB 钩子'
assert '__sbDemoR' in main, 'main 缺教学演示实证 __sbDemoR'
assert 'sv.storybed && sv.storybed.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b27/b28）
assert 'function rescueTick()' in main, 'rescueTick 必须为命名函数（b28 m4）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'rescueTick 缺面板守卫（家族 K）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 双锚重置 + 仅起播设窗
assert 'wrongChainUntil = Date.now() + 7100' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7100'
assert 'if (Date.now() < wrongChainUntil) return;' in main, '救援 interval 缺链豁免守卫（家族 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'startLevel 缺双锚重置（家族 I/J）'
assert "sayW([VOICE.wrong.key, { key: GUIDE_KEY[gk], text: GUIDE[gk] }])" in main, \
    'main 错反馈拼播链（stb_wrong+语义句 clip 键段）缺失（T46 阶段2 形态）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 E：教学演示通道豁免门（demo 参数——吞真实输入但不吞演示）
assert 'uiTapCard(i, true)' in main and '(state.locked && !demo)' in main, '教学 demo 通道缺失（家族 E）'
# Mj-1 防回归（b29，core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即 return
# 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（TTS 恒链尾，clip 段禁置于其后）
for _m in re.finditer(r'\{ key: null[^}]*\}', main):
    _tail = main[_m.end():_m.end() + 8].lstrip()
    assert _tail.startswith(']'), \
        'game-main keyless TTS 段必须居链尾（core queue 弃尾语义，契约 N）：%r' % _tail[:6]

# ===== 语音窗静态断言（家族 G/H/I/T + estMs 全字符口径 n×345+600；r10 三句族）=====
est_ms = lambda n: n * 345 + 600
# 语义句模板逐字钉死（契约 I 下界依据；r10 三句族：wrong/distract 10 字 + miss 8 字）
for frag, ln in (('再想想现在做哪一件事', 10), ('这一步不在这个流程里', 10), ('再看看少了哪一步', 8)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == ln, '语义句 %s 应 %d 字符' % (frag, ln)
# T46 阶段2（2026-09-19）：三句族 clip 化（ffprobe=SPEC_DUR 口径：wrong 3120/distract 2880/miss 2592）
# ——链下界从 estMs(10 字=4050) 改按 clip 实长 3120 推导（禁从实现归纳）
assert 'const GUIDE_KEY = ' in data, 'game-data 缺 GUIDE_KEY 键段映射（T46 阶段2）'
# 错链豁免窗 7100 须罩住最长句 clip（stb_g_wrong 3120）：2496+150+3120+300=6066 ≤ 7100
assert 2496 + 150 + 3120 + 300 <= 7100, '错链窗 7100 罩不住 stb_g_wrong 3120 句族'
# 实长（SPEC-BATCH30 §4）：right 2520 / wrong 2496 / 步音 max 1896 / watch 3096 / turn 1776 / next 1488
D_RIGHT, D_WRONG, D_SMAX = 2520, 2496, 1896
D_WATCH, D_TURN, D_NEXT = 3096, 1776, 1488
# ① 判对确认链窗（契约 G/H）：queue([stb_right, 末点点步音]) 链=2520+150+max 步音 1896=4566
#    → 演出窗 1800+3400=5200 ≥ 链+300=4866（r10：末步=placed 末点/miss 题=缺失步——伞步音 1608<1896 不破）
assert 'KIDS.voice.queue([VOICE.right.key, stepKeyOf(q.placed[q.placed.length - 1])])' in main, \
    'main 缺判对确认链（order/rain 末点点步音）'
assert 'KIDS.voice.queue([VOICE.right.key, stepKeyOf(q.missingId)])' in main, \
    'main 缺 miss 题确认链（right+缺失步步音）'
assert '1800 * SPEED' in main and '3400 * SPEED' in main, 'main 判对演出窗 5200（1800+3400）缺失'
assert 1800 + 3400 >= D_RIGHT + 150 + D_SMAX + 300, \
    '判对演出窗 5200 < 确认链 %d+150+%d+300=%d' % (D_RIGHT, D_SMAX, D_RIGHT + 150 + D_SMAX + 300)
# ② 错反馈链豁免窗（家族 I）≥ 链总实长+300：2496+150+stb_g_wrong 3120+300=6066
chain_min = D_WRONG + 150 + 3120 + 300
assert 7100 >= chain_min, '链豁免窗 7100 < stb_wrong 2496+150+stb_g_wrong 3120+300=%d' % chain_min
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ 逐点反馈链（步音+然后呢 ≤1896+150+1488=3534 fire-and-forget）< 方向级救援间隔余量
#    r10：步音=所点步骤 stepId（placed 序——可换序下点哪步播哪步；伞步音 1608<1896 不破上界）
assert 'KIDS.voice.queue([stepKeyOf(sid), VOICE.next.key])' in main, 'main 缺逐点反馈链'
assert D_SMAX + 150 + D_NEXT <= 14000 - 1000, '逐点链 %d > 方向级救援间隔余量' % (D_SMAX + 150 + D_NEXT)
# ④ 教学演示窗：watch clip 3096 → 首 tap 延至 t=900+2500=3400 ≥ 3096+300=3396
assert '900 * SPEED' in main and '2500 * SPEED' in main, 'main 缺教学演示延窗（t=900+2500=3400）'
assert 900 + 2500 >= D_WATCH + 300, '教学演示窗 3400 < stb_tut_watch 3096+300=3396'
# ⑤ turn 后读题延 2100 ≥ 1776+300 防尾截
assert '}, 2100);' in main, 'main 教学 turn 后读题延 2100 缺失（stb_tut_turn 1776+300 防尾截）'
assert 2100 >= D_TURN + 300, 'turn 后读题延 2100 < 1776+300=2076'
# ⑥ winFlow celebrate 后补窗 400（celebrate 2620+400 收尾；确认链已由 5200 窗罩满）
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失'
assert 2620 + 400 >= D_RIGHT + 300, 'celebrate 2620+400=3020 < stb_right 2520+300=2820'
# ⑦ 教学链 watch 预算 ≤16s（源码文本近似分账——执行真值由 verify ⑥ tw≤16000 实测硬断言；
#    文本序 SPEED 段+固定段 + 'step' 锁窗 640×2 + 判对窗 5200；执行路径 15140=3 步全走分支和）
mtut = re.search(r'async function tutorialWatch\(\) \{.*?\n\}', main, re.S)
assert mtut, 'main 缺 tutorialWatch'
tut_speeds = [int(x) for x in re.findall(r'await wait\((\d+) \* SPEED\)', mtut.group(0))]
tut_fixed = [int(x) for x in re.findall(r'await wait\((\d+)\);', mtut.group(0))]
budget = sum(tut_speeds) + sum(tut_fixed) + 640 * 2 + (1800 + 3400)
assert budget <= 16000, '教学 watch 链预算 %dms > 16000（SPEED 段 %s + 固定段 %s + step 锁窗 1280 + 判对窗 5200）' % (
    budget, tut_speeds, tut_fixed)
# ⑧ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1800 + 3400' in verif, 'verify 缺 estMs 动态断言'
assert 'tw <= 16000 + 4000' in verif, 'verify 缺教学链 16s 门禁（verify 层=16s+4s 折算余量；真实 16s 墙钟由 _selftest §5 计时断言承担——m-3 消歧：本断言与实现字面一致不再前缀恒真）'
assert "'stb_g_wrong'" in verif and "'stb_g_miss'" in verif, 'verify 缺三句族键段断言（T46 阶段2 替代 keylessLast）'
# SPEC 独立硬编码表在场（双录对账前提）+ 实长表数值一致（§4）
for sym in ['SPEC_FLOWS', 'SPEC_DUR', 'SPEC_SENT']:
    assert ('const ' + sym) in verif, 'verify 缺 SPEC 独立表 %s' % sym
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"'(stb_\w+)':\s*(\d+)", mdur.group(1)))
assert dur_vals == {'stb_tut_watch': '3096', 'stb_tut_turn': '1776', 'stb_hint': '2040',
                    'stb_right': '2520', 'stb_wrong': '2496', 'stb_q': '1896', 'stb_next': '1488',
                    'stb_q_rain': '3312', 'stb_q_miss': '1992', 'stb_s_out_4': '1608',
                    'stb_s_sleep_3': '1896', 'stb_s_bath_0': '1560', 'stb_s_washhand_1': '1848',
                    'stb_g_wrong': '3120', 'stb_g_distract': '2880', 'stb_g_miss': '2592'}, \
    'SPEC_DUR 与 §4+§6.6 实长表不符：%s' % dur_vals
# 帧内容断言在场（家族 M：卡 DOM==卡池 + done 类切换——逐卡驱动后必断言）
assert 'domBoardOk' in verif and 'domLit' in verif, 'verify 缺帧内容断言器（家族 M）'
# 存档断言单元在场（家族 C）
assert 'kidsgame_storybed' in verif, 'verify 缺存档键断言（家族 C）'
# r10 新单元符号在场：可换序多解判定（双合法序驱动）/ 条件插入 / 缺步补对 / 认知时长硬断言 /
# nextHint 章末独立副本+off-by-one 哨兵 / miss 链 DOM 对账 / 三句族错链
for sym in ('SPEC_DEPS', 'SPEC_COG', 'multiOrder', 'rainInsert', 'missGap', 'cogHard',
            'hintChSentinel', 'domChainOk', 'chainM', 'SPEC_SENT'):
    assert sym in verif, 'verify 缺 r10 断言符号 %s' % sym

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>晚安故事序</title>' in head, 'head 缺标题 晚安故事序'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('flows: %d × 4 steps (SPEC 对账通过) deps=6 (§6.1 对账通过) clips=%d (stb 37 + core 3)' % (len(got_flows), n_clips))
print('estMs check: confirm-chain %d+150+%d+300=%d <= right-win 5200; '
      'wrong-chain %d+150+stb_g_wrong 3120+300=%d <= wrongChainUntil 7100' % (
          D_RIGHT, D_SMAX, D_RIGHT + 150 + D_SMAX + 300, D_WRONG, chain_min))
print('tutorial budget: SPEED %s + fixed %s + step-lock 1280 + judge-win 5200 = %dms <= 16000' % (
    tut_speeds, tut_fixed, budget))
